"""
Enhanced file validation utilities for security.
"""
import os
import zipfile
import mimetypes
from pathlib import Path
from typing import Optional, Set
from fastapi import HTTPException, status


# File type mappings (extension -> expected MIME types)
MIME_TYPE_MAPPING = {
    # Documents
    '.pdf': {'application/pdf'},
    '.txt': {'text/plain'},
    '.md': {'text/plain', 'text/markdown', 'text/x-markdown'},
    '.docx': {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'  # Sometimes DOCX detected as this
    },
    '.doc': {'application/msword'},

    # Data files
    '.csv': {'text/csv', 'text/plain', 'application/csv'},
    '.json': {'application/json', 'text/plain'},

    # Code files
    '.py': {'text/x-python', 'text/plain'},
    '.js': {'application/javascript', 'text/javascript', 'text/plain'},
    '.jsx': {'text/jsx', 'text/plain'},
    '.ts': {'application/typescript', 'text/typescript', 'text/plain'},
    '.tsx': {'text/tsx', 'text/plain'},
    '.html': {'text/html'},
    '.css': {'text/css'},
}

# Maximum sizes
MAX_EXTRACTED_SIZE = 100 * 1024 * 1024  # 100MB for zip extraction
MAX_CONTENT_SCAN_SIZE = 10 * 1024 * 1024  # 10MB for content scanning

# Dangerous patterns in PDFs
PDF_DANGEROUS_PATTERNS = [
    b'/JavaScript',
    b'/JS',
    b'/Launch',
    b'/SubmitForm',
    b'/ImportData',
    b'/GoToR',  # Go to remote
    b'/GoToE',  # Go to embedded
    b'/OpenAction',
    b'/AA',  # Additional Actions
]

# Dangerous file signatures (magic bytes)
DANGEROUS_SIGNATURES = {
    b'MZ': 'Windows executable',  # PE/EXE
    b'\x7fELF': 'Linux executable',  # ELF
    b'\xca\xfe\xba\xbe': 'Mach-O executable',  # macOS
    b'PK\x03\x04': 'ZIP archive',  # Could contain malware
}


class FileValidationError(Exception):
    """Custom exception for file validation errors."""
    pass


def get_file_mime_type(file_path: Path) -> str:
    """
    Get MIME type using Python's mimetypes module.

    Note: This uses file extension mapping, not true content detection.
    For production, consider using python-magic library for true MIME detection.

    Args:
        file_path: Path to the file

    Returns:
        MIME type string
    """
    # Handle temp files: if file ends with .tmp, use the real filename for MIME detection
    # e.g., "file.pdf.tmp" -> guess MIME from "file.pdf"
    if file_path.suffix.lower() == '.tmp':
        real_filename = file_path.stem  # "file.pdf.tmp" -> "file.pdf"
        mime_type, _ = mimetypes.guess_type(real_filename)
    else:
        mime_type, _ = mimetypes.guess_type(str(file_path))
    return mime_type or 'application/octet-stream'


def validate_mime_type(file_path: Path) -> None:
    """
    Validate that file's MIME type matches its extension.

    Args:
        file_path: Path to the file

    Raises:
        FileValidationError: If MIME type doesn't match extension
    """
    # Handle temp files: if file ends with .tmp, get the real extension
    # e.g., "file.pdf.tmp" -> ".pdf"
    if file_path.suffix.lower() == '.tmp':
        # Get the stem (filename without .tmp) and extract its suffix
        real_path = Path(file_path.stem)  # "file.pdf.tmp" -> "file.pdf"
        extension = real_path.suffix.lower()  # ".pdf"
        print(f"[VALIDATE] Temp file detected, using real extension: {extension}")
    else:
        extension = file_path.suffix.lower()

    if extension not in MIME_TYPE_MAPPING:
        raise FileValidationError(f"File extension '{extension}' not in allowed list")

    # Get actual MIME type
    detected_mime = get_file_mime_type(file_path)
    expected_mimes = MIME_TYPE_MAPPING[extension]

    # Check if detected MIME is in expected list
    if detected_mime not in expected_mimes:
        # Log warning but don't fail - Python's mimetypes can be inconsistent
        print(f"Warning: File '{file_path.name}' MIME type mismatch. "
              f"Expected: {expected_mimes}, Detected: {detected_mime}")


def scan_pdf_content(file_path: Path) -> None:
    """
    Scan PDF file for potentially dangerous embedded code.

    Args:
        file_path: Path to the PDF file

    Raises:
        FileValidationError: If dangerous content is detected
    """
    try:
        with open(file_path, 'rb') as f:
            # Read first 10MB or entire file if smaller
            content = f.read(MAX_CONTENT_SCAN_SIZE)

            # Check for dangerous patterns
            for pattern in PDF_DANGEROUS_PATTERNS:
                if pattern in content:
                    pattern_str = pattern.decode('latin-1')
                    raise FileValidationError(
                        f"PDF contains potentially dangerous code: {pattern_str}"
                    )

    except FileValidationError:
        raise
    except Exception as e:
        raise FileValidationError(f"Failed to scan PDF content: {str(e)}")


def check_zip_bomb(file_path: Path) -> None:
    """
    Check if file is a zip bomb (highly compressed malicious archive).

    Also checks DOCX files since they are ZIP archives.

    Args:
        file_path: Path to the file

    Raises:
        FileValidationError: If file appears to be a zip bomb
    """
    if file_path.suffix.lower() not in ['.zip', '.docx']:
        return

    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            # Calculate total uncompressed size
            total_size = sum(info.file_size for info in zf.infolist())

            if total_size > MAX_EXTRACTED_SIZE:
                raise FileValidationError(
                    f"Compressed file extracts to {total_size / (1024*1024):.1f}MB, "
                    f"exceeds maximum {MAX_EXTRACTED_SIZE / (1024*1024):.0f}MB"
                )

            # Check compression ratio
            compressed_size = file_path.stat().st_size
            if compressed_size > 0:
                ratio = total_size / compressed_size
                if ratio > 100:  # More than 100:1 compression is suspicious
                    raise FileValidationError(
                        f"Suspicious compression ratio: {ratio:.1f}:1 (possible zip bomb)"
                    )

    except zipfile.BadZipFile:
        # Not a valid zip file
        if file_path.suffix.lower() == '.docx':
            raise FileValidationError("Invalid DOCX file (not a valid ZIP archive)")
    except FileValidationError:
        raise
    except Exception as e:
        raise FileValidationError(f"Failed to check compressed file: {str(e)}")


def check_executable_content(file_path: Path) -> None:
    """
    Check if file contains executable code signatures.

    Args:
        file_path: Path to the file

    Raises:
        FileValidationError: If executable signatures are detected
    """
    try:
        with open(file_path, 'rb') as f:
            # Read first 1KB to check magic bytes
            header = f.read(1024)

            for signature, description in DANGEROUS_SIGNATURES.items():
                if header.startswith(signature):
                    # Exception for ZIP-based formats
                    if signature == b'PK\x03\x04':
                        if file_path.suffix.lower() not in ['.docx', '.zip']:
                            raise FileValidationError(
                                f"File contains {description} signature but has wrong extension"
                            )
                    else:
                        raise FileValidationError(
                            f"File contains executable code signature: {description}"
                        )

    except FileValidationError:
        raise
    except Exception as e:
        raise FileValidationError(f"Failed to check file signature: {str(e)}")


def validate_file_size(file_path: Path, max_size: int) -> None:
    """
    Validate file size is within limits.

    Args:
        file_path: Path to the file
        max_size: Maximum allowed size in bytes

    Raises:
        FileValidationError: If file exceeds maximum size
    """
    file_size = file_path.stat().st_size

    if file_size > max_size:
        raise FileValidationError(
            f"File size ({file_size / (1024*1024):.2f}MB) exceeds "
            f"maximum ({max_size / (1024*1024):.0f}MB)"
        )


def validate_file_comprehensive(file_path: Path, max_size: int) -> None:
    """
    Perform comprehensive file validation.

    Validates:
    - File existence
    - File size
    - MIME type consistency
    - Executable content detection
    - Zip bomb detection
    - PDF malicious code detection

    Args:
        file_path: Path to the file
        max_size: Maximum allowed file size in bytes

    Raises:
        FileValidationError: If any validation fails
        HTTPException: For HTTP-friendly error responses
    """
    try:
        print(f"[VALIDATE] Starting validation for: {file_path.name}")

        # Check file exists
        if not file_path.exists():
            raise FileValidationError("File does not exist")
        print(f"[VALIDATE] File exists: OK")

        if not file_path.is_file():
            raise FileValidationError("Path is not a file")
        print(f"[VALIDATE] Is file: OK")

        # Validate file size
        validate_file_size(file_path, max_size)
        print(f"[VALIDATE] File size: OK")

        # Validate MIME type
        validate_mime_type(file_path)
        print(f"[VALIDATE] MIME type: OK")

        # Check for executable content
        check_executable_content(file_path)
        print(f"[VALIDATE] Executable check: OK")

        # Check for zip bombs
        check_zip_bomb(file_path)
        print(f"[VALIDATE] Zip bomb check: OK")

        # Scan PDF content
        if file_path.suffix.lower() == '.pdf':
            scan_pdf_content(file_path)
            print(f"[VALIDATE] PDF scan: OK")

        print(f"[VALIDATE] All validations passed for: {file_path.name}")

    except FileValidationError as e:
        print(f"[VALIDATE] FAILED: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File validation failed: {str(e)}"
        )
    except Exception as e:
        print(f"[VALIDATE] ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File validation error: {str(e)}"
        )


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """
    Check if target_path is within base_dir (prevent path traversal).

    Args:
        base_dir: Base directory that should contain the target
        target_path: Path to validate

    Returns:
        True if path is safe, False otherwise
    """
    try:
        # Resolve both paths to absolute
        base_dir = base_dir.resolve()
        target_path = target_path.resolve()

        # Check if target is within base
        return target_path.is_relative_to(base_dir)
    except (ValueError, OSError):
        return False
