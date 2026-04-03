# backend/app/core/plans.py

from dataclasses import dataclass


@dataclass
class PlanLimits:
    """Usage limits for a subscription plan."""

    workflows: int
    runs_per_month: int
    ai_calls_per_month: int
    run_history_days: int


# Plan definitions
PLANS: dict[str, PlanLimits] = {
    "free": PlanLimits(
        workflows=5,
        runs_per_month=50,
        ai_calls_per_month=30,
        run_history_days=7,
    ),
    "pro": PlanLimits(
        workflows=999999,  # Effectively unlimited
        runs_per_month=5000,
        ai_calls_per_month=2000,
        run_history_days=90,
    ),
}


def get_plan_limits(plan_name: str) -> PlanLimits:
    """Get the limits for a plan. Defaults to free if unknown."""
    return PLANS.get(plan_name, PLANS["free"])
