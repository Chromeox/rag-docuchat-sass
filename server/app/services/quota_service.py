"""
Quota service for managing user limits and usage tracking.
"""
from datetime import date, datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.db.models import UserQuota, Document


class QuotaExceededError(HTTPException):
    """Exception raised when a quota limit is exceeded."""

    def __init__(self, detail: str, tier_limits: Optional[Dict] = None):
        upgrade_message = detail
        if tier_limits:
            upgrade_message += f"\n\nUpgrade to Pro for: {tier_limits.get('upgrade_benefits', 'unlimited access')}"

        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=upgrade_message
        )


class QuotaService:
    """Service for managing and checking user quotas."""

    # Tier limits
    TIER_LIMITS = {
        "free": {
            "max_documents": 50,
            "max_storage_bytes": 500 * 1024 * 1024,  # 500MB
            "max_queries_per_day": 1000,
            "upgrade_benefits": "Unlimited documents, 10GB storage, unlimited queries"
        },
        "pro": {
            "max_documents": 1000,
            "max_storage_bytes": 10 * 1024 * 1024 * 1024,  # 10GB
            "max_queries_per_day": 50000,
            "upgrade_benefits": "Contact sales for Enterprise unlimited access"
        },
        "enterprise": {
            "max_documents": -1,  # Unlimited
            "max_storage_bytes": -1,  # Unlimited
            "max_queries_per_day": -1,  # Unlimited
            "upgrade_benefits": "Already at highest tier"
        }
    }

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_quota(self, user_id: str) -> UserQuota:
        """
        Get existing quota record or create a new one for the user.

        Args:
            user_id: User's Clerk ID

        Returns:
            UserQuota record
        """
        quota = self.db.query(UserQuota).filter(UserQuota.user_id == user_id).first()

        if not quota:
            quota = UserQuota(
                user_id=user_id,
                tier="free",
                document_count=0,
                total_storage_bytes=0,
                queries_today=0,
                last_query_reset=date.today()
            )
            self.db.add(quota)
            self.db.commit()
            self.db.refresh(quota)

        return quota

    def get_tier_limits(self, tier: str) -> Dict:
        """Get limits for a specific tier."""
        return self.TIER_LIMITS.get(tier, self.TIER_LIMITS["free"])

    def reset_daily_queries_if_needed(self, quota: UserQuota) -> None:
        """
        Reset daily query count if it's a new day.

        Args:
            quota: User quota record
        """
        today = date.today()

        if quota.last_query_reset < today:
            quota.queries_today = 0
            quota.last_query_reset = today
            self.db.commit()

    def check_document_quota(self, user_id: str, file_size: int) -> None:
        """
        Check if user can upload a new document.

        Args:
            user_id: User's Clerk ID
            file_size: Size of the file to upload in bytes

        Raises:
            QuotaExceededError: If quota would be exceeded
        """
        quota = self.get_or_create_quota(user_id)
        limits = self.get_tier_limits(quota.tier)

        # Check document count
        max_docs = limits["max_documents"]
        if max_docs > 0 and quota.document_count >= max_docs:
            raise QuotaExceededError(
                f"Document limit reached ({quota.document_count}/{max_docs}). "
                f"Delete old documents or upgrade your plan.",
                tier_limits=limits
            )

        # Check storage space
        max_storage = limits["max_storage_bytes"]
        if max_storage > 0:
            new_total = quota.total_storage_bytes + file_size
            if new_total > max_storage:
                current_mb = quota.total_storage_bytes / (1024 * 1024)
                max_mb = max_storage / (1024 * 1024)
                file_mb = file_size / (1024 * 1024)

                raise QuotaExceededError(
                    f"Storage limit exceeded. Current: {current_mb:.1f}MB, "
                    f"File: {file_mb:.1f}MB, Limit: {max_mb:.0f}MB. "
                    f"Delete old documents or upgrade your plan.",
                    tier_limits=limits
                )

    def check_query_quota(self, user_id: str) -> None:
        """
        Check if user can make another query.

        Args:
            user_id: User's Clerk ID

        Raises:
            QuotaExceededError: If quota is exceeded
        """
        quota = self.get_or_create_quota(user_id)
        self.reset_daily_queries_if_needed(quota)

        limits = self.get_tier_limits(quota.tier)
        max_queries = limits["max_queries_per_day"]

        if max_queries > 0 and quota.queries_today >= max_queries:
            raise QuotaExceededError(
                f"Daily query limit reached ({quota.queries_today}/{max_queries}). "
                f"Limit resets at midnight UTC or upgrade your plan.",
                tier_limits=limits
            )

    def increment_query_count(self, user_id: str) -> None:
        """
        Increment the user's daily query count.

        Args:
            user_id: User's Clerk ID
        """
        quota = self.get_or_create_quota(user_id)
        self.reset_daily_queries_if_needed(quota)

        quota.queries_today += 1
        self.db.commit()

    def increment_document_count(self, user_id: str, file_size: int) -> None:
        """
        Increment document count and storage usage.

        Args:
            user_id: User's Clerk ID
            file_size: Size of the uploaded file in bytes
        """
        quota = self.get_or_create_quota(user_id)
        quota.document_count += 1
        quota.total_storage_bytes += file_size
        self.db.commit()

    def decrement_document_count(self, user_id: str, file_size: int) -> None:
        """
        Decrement document count and storage usage (when deleting).

        Args:
            user_id: User's Clerk ID
            file_size: Size of the deleted file in bytes
        """
        quota = self.get_or_create_quota(user_id)
        quota.document_count = max(0, quota.document_count - 1)
        quota.total_storage_bytes = max(0, quota.total_storage_bytes - file_size)
        self.db.commit()

    def recalculate_usage(self, user_id: str) -> None:
        """
        Recalculate document count and storage from actual documents.
        Useful for fixing inconsistencies.

        Args:
            user_id: User's Clerk ID
        """
        # Get actual counts from documents table
        result = self.db.query(
            func.count(Document.id).label('count'),
            func.sum(Document.file_size).label('total_size')
        ).filter(
            Document.user_id == user_id
        ).first()

        doc_count = result.count or 0
        total_size = result.total_size or 0

        # Update quota
        quota = self.get_or_create_quota(user_id)
        quota.document_count = doc_count
        quota.total_storage_bytes = total_size
        self.db.commit()

    def get_usage_stats(self, user_id: str) -> Dict:
        """
        Get current usage statistics for a user.

        Args:
            user_id: User's Clerk ID

        Returns:
            Dictionary with usage stats and limits
        """
        quota = self.get_or_create_quota(user_id)
        self.reset_daily_queries_if_needed(quota)

        limits = self.get_tier_limits(quota.tier)

        return {
            "tier": quota.tier,
            "documents": {
                "used": quota.document_count,
                "limit": limits["max_documents"],
                "unlimited": limits["max_documents"] < 0
            },
            "storage": {
                "used_bytes": quota.total_storage_bytes,
                "used_mb": round(quota.total_storage_bytes / (1024 * 1024), 2),
                "limit_bytes": limits["max_storage_bytes"],
                "limit_mb": round(limits["max_storage_bytes"] / (1024 * 1024), 0) if limits["max_storage_bytes"] > 0 else -1,
                "unlimited": limits["max_storage_bytes"] < 0
            },
            "queries": {
                "used_today": quota.queries_today,
                "limit_per_day": limits["max_queries_per_day"],
                "unlimited": limits["max_queries_per_day"] < 0,
                "resets_at": "midnight UTC"
            },
            "last_updated": quota.updated_at.isoformat() if quota.updated_at else None
        }

    def upgrade_tier(self, user_id: str, new_tier: str) -> None:
        """
        Upgrade user to a new tier.

        Args:
            user_id: User's Clerk ID
            new_tier: New tier name (free, pro, enterprise)

        Raises:
            ValueError: If tier is invalid
        """
        if new_tier not in self.TIER_LIMITS:
            raise ValueError(f"Invalid tier: {new_tier}")

        quota = self.get_or_create_quota(user_id)
        quota.tier = new_tier
        self.db.commit()

    def reset_user_quota(self, user_id: str) -> None:
        """
        Reset document count and storage usage to zero.
        Called when all documents are cleared.

        Args:
            user_id: User's Clerk ID
        """
        quota = self.get_or_create_quota(user_id)
        quota.document_count = 0
        quota.total_storage_bytes = 0
        self.db.commit()
