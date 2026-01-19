"""
Input sanitization utilities to prevent injection attacks and data corruption.
"""
import re
import html
from pathlib import Path
from typing import Optional


def sanitize_message(message: str, max_length: int = 10000) -> str:
    """
    Sanitize user message for LLM processing.

    Removes:
    - HTML tags and entities
    - Control characters
    - Null bytes
    - Excessive whitespace

    Args:
        message: The user's chat message
        max_length: Maximum allowed message length

    Returns:
        Sanitized message string

    Raises:
        ValueError: If message is empty after sanitization
    """
    if not message:
        raise ValueError("Message cannot be empty")

    # Unescape HTML entities first
    message = html.unescape(message)

    # Remove HTML tags (basic implementation - no dependencies)
    message = re.sub(r'<[^>]+>', '', message)

    # Remove null bytes and control characters (except newlines and tabs)
    message = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', message)

    # Normalize whitespace (preserve newlines)
    lines = message.split('\n')
    lines = [' '.join(line.split()) for line in lines]
    message = '\n'.join(lines)

    # Limit length
    if len(message) > max_length:
        message = message[:max_length]

    # Strip leading/trailing whitespace
    message = message.strip()

    if not message:
        raise ValueError("Message is empty after sanitization")

    return message


def sanitize_conversation_title(title: str, max_length: int = 200) -> str:
    """
    Sanitize conversation title for database storage.

    Args:
        title: The conversation title
        max_length: Maximum allowed title length

    Returns:
        Sanitized title string

    Raises:
        ValueError: If title is empty after sanitization
    """
    if not title:
        raise ValueError("Title cannot be empty")

    # Unescape HTML entities
    title = html.unescape(title)

    # Remove HTML tags
    title = re.sub(r'<[^>]+>', '', title)

    # Remove all control characters (including newlines for titles)
    title = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', title)

    # Normalize whitespace (collapse to single spaces)
    title = ' '.join(title.split())

    # Limit length
    if len(title) > max_length:
        title = title[:max_length].rsplit(' ', 1)[0]  # Break at word boundary
        title = title.rstrip('.,;:')  # Remove trailing punctuation

    title = title.strip()

    if not title:
        raise ValueError("Title is empty after sanitization")

    return title


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename to prevent path traversal and filesystem issues.

    Removes:
    - Path separators (/, \\)
    - Parent directory references (..)
    - Control characters
    - Special shell characters

    Args:
        filename: The original filename
        max_length: Maximum allowed filename length

    Returns:
        Safe filename string

    Raises:
        ValueError: If filename is invalid or empty after sanitization
    """
    if not filename:
        raise ValueError("Filename cannot be empty")

    # Get just the filename component (remove any path)
    filename = Path(filename).name

    if not filename or filename in ('.', '..'):
        raise ValueError("Invalid filename")

    # Remove dangerous characters
    # Keep: letters, numbers, dots, dashes, underscores, spaces
    filename = re.sub(r'[^a-zA-Z0-9._\-\s]', '_', filename)

    # Prevent path traversal
    filename = filename.replace('..', '_')

    # Collapse multiple spaces/underscores
    filename = re.sub(r'[\s_]+', '_', filename)

    # Ensure it has an extension
    if '.' not in filename:
        raise ValueError("Filename must have an extension")

    # Limit length (preserve extension)
    if len(filename) > max_length:
        stem, ext = filename.rsplit('.', 1)
        max_stem_length = max_length - len(ext) - 1
        filename = stem[:max_stem_length] + '.' + ext

    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')

    if not filename or filename.startswith('.'):
        raise ValueError("Invalid filename after sanitization")

    return filename


def strip_dangerous_characters(text: str, allow_newlines: bool = True) -> str:
    """
    Remove potentially dangerous characters from generic text input.

    Args:
        text: Input text
        allow_newlines: Whether to preserve newline characters

    Returns:
        Text with dangerous characters removed
    """
    if not text:
        return ""

    if allow_newlines:
        # Remove control chars except newlines and tabs
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    else:
        # Remove all control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)

    return text.strip()


def validate_user_id(user_id: str) -> str:
    """
    Validate and sanitize user ID (Clerk ID format).

    Args:
        user_id: The user identifier

    Returns:
        Validated user ID

    Raises:
        ValueError: If user ID is invalid
    """
    if not user_id:
        raise ValueError("User ID cannot be empty")

    # Clerk IDs are alphanumeric with underscores
    # Format: user_<random_string>
    if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
        raise ValueError("Invalid user ID format")

    if len(user_id) > 255:
        raise ValueError("User ID too long")

    return user_id


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to maximum length, adding suffix if truncated.

    Args:
        text: Text to truncate
        max_length: Maximum length (including suffix)
        suffix: Suffix to add if truncated

    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix
