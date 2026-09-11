def calculate_center_score(
    capacity_per_day,
    used_capacity,
    queue_count,
    distance_km=0
):
    """
    Rule-based Smart Allotment scoring.

    Higher score = better center.

    Factors:
    - Available capacity: 40%
    - Queue load: 25%
    - Utilization: 15%
    - Distance: 10%
    - Waiting time: 10%
    """

    capacity_per_day = float(capacity_per_day or 0)
    used_capacity = float(used_capacity or 0)
    queue_count = int(queue_count or 0)
    distance_km = float(distance_km or 0)

    if capacity_per_day <= 0:
        return {
            "score": 0,
            "available_capacity": 0,
            "utilization": 100,
            "estimated_wait_minutes": 999
        }

    available_capacity = max(
        capacity_per_day - used_capacity,
        0
    )

    # Capacity score
    capacity_score = (
        available_capacity / capacity_per_day
    ) * 100

    # Queue score
    # 0 queue = 100
    # 20+ queue = 0
    queue_score = max(
        0,
        100 - (queue_count * 5)
    )

    # Utilization score
    utilization = (
        used_capacity / capacity_per_day
    ) * 100

    utilization_score = max(
        0,
        100 - utilization
    )

    # Distance score
    # 0 km = 100
    # 50+ km = 0
    distance_score = max(
        0,
        100 - (distance_km * 2)
    )

    # Estimated waiting time
    estimated_wait_minutes = queue_count * 5

    waiting_score = max(
        0,
        100 - estimated_wait_minutes
    )

    # Final weighted score
    score = (
        capacity_score * 0.40
        + queue_score * 0.25
        + utilization_score * 0.15
        + distance_score * 0.10
        + waiting_score * 0.10
    )

    return {
        "score": round(score, 2),
        "available_capacity": round(
            available_capacity,
            2
        ),
        "utilization": round(
            utilization,
            2
        ),
        "estimated_wait_minutes": estimated_wait_minutes
    }