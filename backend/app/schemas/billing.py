# backend/app/schemas/billing.py

from pydantic import BaseModel


class UsageItem(BaseModel):
    used: int
    limit: int


class UsageSummary(BaseModel):
    workflows: UsageItem
    workflow_runs: UsageItem
    ai_node_calls: UsageItem


class BillingUsageResponse(BaseModel):
    plan: str
    billing_cycle_start: str
    billing_cycle_end: str
    usage: UsageSummary


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str
