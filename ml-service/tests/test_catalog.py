import json
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


def test_fault_map_and_diagnosis_catalog_have_complete_coverage():
    fault_map = json.loads(
        (ROOT_DIR / "data" / "fault_code_map.json").read_text(encoding="utf-8")
    )
    catalog = json.loads(
        (ROOT_DIR / "data" / "diagnosis-catalog.json").read_text(encoding="utf-8")
    )

    mapped_alarm_codes = [
        alarm_code
        for entry in fault_map["entries"]
        for alarm_code in entry["alarmCodes"]
    ] + [
        entry["alarmCode"] for entry in fault_map["diagnosisOnlyAlarmCodes"]
    ]
    catalog_alarm_codes = [
        alarm_code
        for entry in catalog["entries"]
        for alarm_code in entry["alarmCodes"]
    ]
    mapped_failure_types = {
        entry["datasetFailureType"]
        for entry in fault_map["entries"]
        if entry["datasetFailureType"]
    }
    catalog_failure_types = {
        entry["datasetFailureType"]
        for entry in catalog["entries"]
        if entry.get("datasetFailureType")
    }

    assert fault_map["_meta"]["status"] == "FROZEN"
    assert not any(entry["review"] for entry in fault_map["entries"])
    assert len(mapped_alarm_codes) == 23
    assert len(set(mapped_alarm_codes)) == 23
    assert set(mapped_alarm_codes) == set(catalog_alarm_codes)
    assert len(mapped_failure_types) == 13
    assert mapped_failure_types == catalog_failure_types


def test_every_diagnosis_has_causes_and_ordered_actions():
    catalog = json.loads(
        (ROOT_DIR / "data" / "diagnosis-catalog.json").read_text(encoding="utf-8")
    )
    for entry in catalog["entries"]:
        assert entry["probableCauses"]
        assert entry["correctiveActions"]
        assert [action["step"] for action in entry["correctiveActions"]] == list(
            range(1, len(entry["correctiveActions"]) + 1)
        )
