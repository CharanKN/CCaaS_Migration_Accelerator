"""Avaya Aura source-export parser.

Consumes the normalized JSON bundle an SME assembles from Avaya ASA/OSSI CLI
dumps (``list vdn``, ``display vector``, ``list hunt-group``, ``list
agent-loginID``), a CMS ODBC extract, and an Announcement Board directory
listing — the object inventory described in PRD.md section 2.2.1. Real Avaya
exports are screen-scraped text (PRD F-100/F-101, not yet built); this parses
that text once an SME has normalized it to JSON, matching the exact shape in
``data/samples/avaya_ivr_export.json``.
"""
from __future__ import annotations

from ...core.errors import AppError


class AvayaParseError(AppError):
    status_code = 422
    message = "Could not parse Avaya export"


def _complexity(step_count: int, has_adjunct: bool) -> tuple[str, int]:
    """Rough complexity heuristic from vector step count + adjunct routing.

    Mirrors how a migration SME would eyeball vector complexity: more steps
    (branches, queues, announcements) or an ASAI/adjunct dependency both push
    a vector toward "High" since they need manual review in the target.
    """
    if has_adjunct or step_count >= 8:
        return "High", min(95, 55 + step_count * 5)
    if step_count >= 5:
        return "Med", min(65, 35 + step_count * 5)
    return "Low", min(35, 15 + step_count * 4)


def parse_avaya_export(payload: dict) -> dict:
    """Parse a normalized Avaya export bundle into discovered/inventory/gap.

    Returns a dict shaped like the ``Scenario`` fields of the same name, so
    the result can be merged directly onto an existing scenario.
    """
    if not isinstance(payload, dict):
        raise AvayaParseError("Export root must be a JSON object")

    vectors = payload.get("vectors") or []
    vdns = payload.get("vdns") or []
    splits = payload.get("huntGroupsSplits") or []
    skills = payload.get("easSkills") or []
    announcements = payload.get("announcements") or []
    holiday_tables = payload.get("holidayTables") or []
    adjunct_routes = payload.get("adjunctRoutes") or []

    if not vectors or not vdns:
        raise AvayaParseError(
            "Export is missing 'vectors' or 'vdns' — not a recognized Avaya Aura bundle"
        )

    vectors_by_number = {v.get("number"): v for v in vectors}

    inventory: list[dict] = []

    for vdn in vdns:
        vector = vectors_by_number.get(vdn.get("vector"))
        if vector is None:
            continue
        steps = vector.get("steps") or []
        has_adjunct = bool(vector.get("adjunctRouting"))
        complexity, cpct = _complexity(len(steps), has_adjunct)
        n_prompts = len(vector.get("referencedAnnouncements") or [])
        n_skills = len(vector.get("referencedSkills") or [])
        deps = f"{n_prompts} prompts, {n_skills} skills"
        if has_adjunct:
            deps += ", ASAI link"
        status = "Review" if (has_adjunct or complexity == "High") else "Auto-mapped"
        inventory.append({
            "name": vdn.get("name") or vector.get("name") or "Unnamed Vector",
            "id": f"VDN-{vdn.get('vdn')}",
            "type": "Vector",
            "complexity": complexity,
            "cpct": cpct,
            "deps": deps,
            "status": status,
        })

    for split in splits:
        agents = int(split.get("agents") or 0)
        complexity = "Med" if agents >= 15 else "Low"
        cpct = min(60, 15 + agents * 2)
        inventory.append({
            "name": split.get("name") or f"Split_{split.get('group')}",
            "id": f"SPL-{int(split.get('group') or 0):03d}",
            "type": "Skill/Split",
            "complexity": complexity,
            "cpct": cpct,
            "deps": f"{agents} agents",
            "status": "Auto-mapped",
        })

    for skill in skills:
        n_splits = len(skill.get("splitsAssigned") or [])
        name = skill.get("name") or f"Skill_{skill.get('skill')}"
        is_priority = "vip" in name.lower() or n_splits > 1
        inventory.append({
            "name": name,
            "id": f"SK-{int(skill.get('skill') or 0):03d}",
            "type": "Skill",
            "complexity": "Med" if is_priority else "Low",
            "cpct": 55 if is_priority else 35,
            "deps": f"{n_splits} split{'s' if n_splits != 1 else ''}",
            "status": "Review" if is_priority else "Auto-mapped",
        })

    for i, adj in enumerate(adjunct_routes, start=1):
        inventory.append({
            "name": f"{adj.get('name', 'Adjunct Route')} ({adj.get('type', 'ASAI')})",
            "id": f"ADJ-{i:03d}",
            "type": "Adjunct Route",
            "complexity": "High",
            "cpct": 95,
            "deps": "External CTI",
            "status": "Unsupported",
        })

    warnings = sum(1 for h in holiday_tables if h.get("warning"))
    discovered = [
        {"label": "IVR Call Flows (Vectors)", "count": len(vectors), "status": "Parsed"},
        {"label": "Audio Prompts (Announcements)", "count": len(announcements), "status": "Parsed"},
        {"label": "Queues (Skills/Splits)", "count": len(splits), "status": "Parsed"},
        {"label": "Skills (EAS)", "count": len(skills), "status": "Parsed"},
        {"label": "DNIS / VDNs", "count": len(vdns), "status": "Parsed"},
        {
            "label": "Holiday Tables",
            "count": len(holiday_tables),
            "status": f"{warnings} Warning" if warnings else "Parsed",
        },
    ]

    auto = sum(1 for i in inventory if i["status"] == "Auto-mapped")
    review = sum(1 for i in inventory if i["status"] == "Review")
    unsupported = sum(1 for i in inventory if i["status"] == "Unsupported")
    avg_cpct = sum(i["cpct"] for i in inventory) / len(inventory) if inventory else 0

    gap = {
        "auto": auto,
        "review": review,
        "unsupported": unsupported,
        "complexity": f"{avg_cpct / 10:.1f}",
    }

    return {"discovered": discovered, "inventory": inventory, "gap": gap}
