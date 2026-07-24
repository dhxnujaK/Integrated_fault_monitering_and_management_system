import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = process.cwd();
const dataDir = path.join(repoRoot, "ml-service", "data");
const outputDir = path.join(
  repoRoot,
  "outputs",
  "019f94e8-dbb4-7bb0-91d5-a1f47fe27654",
);
const csvPath = path.join(dataDir, "expressway_power_training_dataset.csv");
const catalogCsvPath = path.join(dataDir, "fault_solution_catalog.csv");
const featureConfigPath = path.join(dataDir, "feature_config.json");
const byTypeDir = path.join(dataDir, "by_equipment_type");
const workbookPath = path.join(outputDir, "expressway_power_dataset.xlsx");
const previewDir = path.join(outputDir, "previews");

const START = Date.parse("2025-01-01T00:00:00Z");
const DAYS = 180;
const INTERVAL_MINUTES = 5;
const INTERVAL_MS = INTERVAL_MINUTES * 60_000;
const END = START + DAYS * 24 * 60 * 60_000;
const SITE_ID = "E01-GELA";
const SITE_UTC_OFFSET_MINUTES = 5 * 60 + 30;
const SEED = 5206;

const equipment = [
  { id: "GENERATOR-01", type: "GENERATOR", location: "Generator Room" },
  { id: "ATS-01", type: "ATS", location: "Main Power Room" },
  { id: "MDP-01", type: "MDP", location: "Main Power Room" },
  { id: "SDP-01", type: "SDP", location: "Server Room 01", ups: "UPS-01" },
  { id: "SDP-02", type: "SDP", location: "Control Centre 01", ups: "UPS-02" },
  { id: "UPS-01", type: "UPS", location: "Server Room 01", sdp: "SDP-01" },
  { id: "UPS-02", type: "UPS", location: "Control Centre 01", sdp: "SDP-02" },
];

const columns = [
  "record_id",
  "timestamp_utc",
  "site_id",
  "equipment_id",
  "equipment_type",
  "location",
  "operating_state",
  "data_split",
  "hour_sin",
  "hour_cos",
  "day_of_week_sin",
  "day_of_week_cos",
  "voltage_L1",
  "voltage_L2",
  "voltage_L3",
  "current_L1",
  "current_L2",
  "current_L3",
  "fuel_level_pct",
  "frequency_hz",
  "running_status",
  "breaker_status",
  "room_temperature_c",
  "intruder_alarm",
  "fire_alarm",
  "active_source",
  "mains_voltage",
  "generator_voltage",
  "transfer_status",
  "last_transfer_at",
  "voltage_R",
  "voltage_Y",
  "voltage_B",
  "current_R",
  "current_Y",
  "current_B",
  "main_breaker_status",
  "operational_status",
  "battery_charge_pct",
  "battery_voltage_v",
  "input_voltage_v",
  "output_voltage_v",
  "load_pct",
  "estimated_runtime_min",
  "temperature_c",
  "fault_code",
  "phase_voltage_imbalance_v",
  "phase_current_imbalance_pct",
  "voltage_deviation_pct",
  "temperature_change_c_per_hour",
  "load_change_pct_per_hour",
  "battery_discharge_rate_pct_per_hour",
  "target_failure_within_15_min",
  "target_failure_within_60_min",
  "target_failure_within_6_hours",
  "target_time_to_failure_min",
  "target_fault_active",
  "target_failure_type",
  "target_risk_level",
  "target_maintenance_required",
];

const metadataColumns = [
  "record_id",
  "timestamp_utc",
  "site_id",
  "equipment_id",
  "equipment_type",
  "location",
  "data_split",
];
const targetColumns = columns.filter((name) => name.startsWith("target_"));
const futureFailureTargetColumns = [
  "target_failure_within_15_min",
  "target_failure_within_60_min",
  "target_failure_within_6_hours",
  "target_time_to_failure_min",
];
const diagnosticTargetColumns = targetColumns.filter(
  (name) => !futureFailureTargetColumns.includes(name),
);

const featureColumnsByType = {
  GENERATOR: [
    "operating_state", "hour_sin", "hour_cos", "day_of_week_sin", "day_of_week_cos",
    "voltage_L1", "voltage_L2", "voltage_L3", "current_L1", "current_L2", "current_L3",
    "fuel_level_pct", "frequency_hz", "running_status", "breaker_status",
    "room_temperature_c", "intruder_alarm", "fire_alarm", "phase_voltage_imbalance_v",
    "phase_current_imbalance_pct", "voltage_deviation_pct", "temperature_change_c_per_hour",
  ],
  ATS: [
    "operating_state", "hour_sin", "hour_cos", "day_of_week_sin", "day_of_week_cos",
    "active_source", "mains_voltage", "generator_voltage", "transfer_status", "breaker_status",
    "room_temperature_c", "intruder_alarm", "fire_alarm", "voltage_deviation_pct",
    "temperature_change_c_per_hour",
  ],
  MDP: [
    "operating_state", "hour_sin", "hour_cos", "day_of_week_sin", "day_of_week_cos",
    "voltage_R", "voltage_Y", "voltage_B", "current_R", "current_Y", "current_B",
    "main_breaker_status", "room_temperature_c", "intruder_alarm", "fire_alarm",
    "phase_voltage_imbalance_v", "phase_current_imbalance_pct", "voltage_deviation_pct",
    "temperature_change_c_per_hour",
  ],
  SDP: [
    "operating_state", "hour_sin", "hour_cos", "day_of_week_sin", "day_of_week_cos",
    "voltage_R", "voltage_Y", "voltage_B", "current_R", "current_Y", "current_B",
    "breaker_status", "room_temperature_c", "intruder_alarm", "fire_alarm",
    "phase_voltage_imbalance_v", "phase_current_imbalance_pct", "voltage_deviation_pct",
    "temperature_change_c_per_hour",
  ],
  UPS: [
    "operating_state", "hour_sin", "hour_cos", "day_of_week_sin", "day_of_week_cos",
    "operational_status", "battery_charge_pct", "battery_voltage_v", "input_voltage_v",
    "output_voltage_v", "load_pct", "estimated_runtime_min", "temperature_c", "fault_code",
    "voltage_deviation_pct", "temperature_change_c_per_hour", "load_change_pct_per_hour",
    "battery_discharge_rate_pct_per_hour",
  ],
};
const outputColumnsByType = Object.fromEntries(
  Object.entries(featureColumnsByType).map(([type, featureColumns]) => [
    type,
    [
      ...metadataColumns,
      ...featureColumns,
      ...(type === "ATS" ? diagnosticTargetColumns : targetColumns),
    ],
  ]),
);

const failureCatalog = [
  {
    failureType: "GEN_LOW_FUEL",
    subsystem: "GENERATOR",
    severity: "WARNING",
    precursor: "Fuel level declines below 20% and continues toward the critical range.",
    rootCause: "Fuel consumed during extended operation or fuel not replenished after testing.",
    action: "Refill the day tank; inspect the supply line and update the refuelling schedule.",
  },
  {
    failureType: "GEN_OVERHEAT",
    subsystem: "GENERATOR",
    severity: "CRITICAL",
    precursor: "Room temperature rises with increasing phase-current imbalance and frequency variation.",
    rootCause: "Restricted ventilation or insufficient cooling during sustained generator operation.",
    action: "Reduce load; inspect ventilation, coolant level, radiator and cooling fans.",
  },
  {
    failureType: "GEN_VOLTAGE_INSTABILITY",
    subsystem: "GENERATOR",
    severity: "CRITICAL",
    precursor: "Phase voltage spread and frequency deviation increase before output becomes unstable.",
    rootCause: "Alternator regulation or governor instability under changing load.",
    action: "Isolate nonessential load; inspect AVR, governor response and phase connections.",
  },
  {
    failureType: "ATS_TRANSFER_FAILURE",
    subsystem: "ATS",
    severity: "CRITICAL",
    precursor: "Mains becomes unavailable while generator voltage is present, but transfer is not completed.",
    rootCause: "Transfer mechanism, control relay or emergency-stop interlock prevents source changeover.",
    action: "Verify emergency-stop and interlocks; inspect transfer actuator and control relays; transfer manually if authorised.",
  },
  {
    failureType: "MDP_SUPPLY_LOSS",
    subsystem: "MDP",
    severity: "CRITICAL",
    precursor: "All incoming phases collapse following an upstream ATS transfer failure.",
    rootCause: "Upstream ATS did not forward generator power to the main distribution panel.",
    action: "Restore the upstream source through the ATS before investigating downstream panels.",
  },
  {
    failureType: "MDP_PHASE_IMBALANCE",
    subsystem: "MDP",
    severity: "WARNING",
    precursor: "One phase drifts while phase-current imbalance and cabinet temperature increase.",
    rootCause: "Uneven phase loading or a loose/high-resistance phase connection.",
    action: "Redistribute load; inspect terminals for heating and torque connections to specification.",
  },
  {
    failureType: "SDP_BREAKER_TRIP",
    subsystem: "SDP",
    severity: "CRITICAL",
    precursor: "Current and temperature rise before the local breaker opens and phase voltage falls to zero.",
    rootCause: "Sustained overload or downstream short-circuit condition.",
    action: "Keep the breaker open; isolate downstream circuits; inspect load and protection coordination before reset.",
  },
  {
    failureType: "SDP_SUPPLY_LOSS",
    subsystem: "SDP",
    severity: "CRITICAL",
    precursor: "All phases collapse because the upstream ATS/MDP supply is unavailable.",
    rootCause: "Loss of the common upstream electrical supply.",
    action: "Restore ATS and MDP supply first; confirm all phases before re-energising the panel.",
  },
  {
    failureType: "UPS_INPUT_POWER_LOSS",
    subsystem: "UPS",
    severity: "WARNING",
    precursor: "Input voltage disappears and the UPS changes to battery operation with declining charge and runtime.",
    rootCause: "Upstream breaker trip or common distribution supply loss.",
    action: "Restore the upstream breaker/source before battery runtime is exhausted; shed nonessential load if needed.",
  },
  {
    failureType: "UPS_BATTERY_DEGRADATION",
    subsystem: "UPS",
    severity: "CRITICAL",
    precursor: "Estimated runtime and battery voltage decline faster than expected during a discharge test.",
    rootCause: "Reduced battery capacity caused by age, temperature exposure or incomplete charging.",
    action: "Run a controlled battery test; inspect battery modules and replace the weak battery string.",
  },
  {
    failureType: "UPS_OVERLOAD",
    subsystem: "UPS",
    severity: "CRITICAL",
    precursor: "Load rises above 80%, temperature increases and estimated runtime falls.",
    rootCause: "Excess connected load or failed load distribution.",
    action: "Remove noncritical load; verify connected equipment and redistribute load between UPS units.",
  },
  {
    failureType: "FIRE_ALARM",
    subsystem: "ALL",
    severity: "CRITICAL",
    precursor: "No dependable telemetry precursor; digital fire input changes state.",
    rootCause: "Fire detector activation or fire-alarm circuit activation.",
    action: "Follow the emergency response procedure; isolate power only when authorised and verify the affected room.",
  },
  {
    failureType: "INTRUDER_ALARM",
    subsystem: "ALL",
    severity: "WARNING",
    precursor: "No dependable telemetry precursor; digital intrusion input changes state.",
    rootCause: "Unauthorised access or intrusion-sensor activation.",
    action: "Verify access records and camera coverage; dispatch authorised security staff.",
  },
];

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = mulberry32(SEED);

function randomClock(startHour, endHour) {
  const firstSlot = startHour * 12;
  const lastSlot = endHour * 12 + 11;
  const slot = firstSlot + Math.floor(random() * (lastSlot - firstSlot + 1));
  return { hour: Math.floor(slot / 12), minute: (slot % 12) * 5 };
}

function variedMinutes(base, variation, minimum = INTERVAL_MINUTES) {
  const raw = base + (random() * 2 - 1) * variation;
  return Math.max(minimum, Math.round(raw / INTERVAL_MINUTES) * INTERVAL_MINUTES);
}

function gaussian(mean = 0, stdDev = 1) {
  const u = Math.max(random(), 1e-12);
  const v = Math.max(random(), 1e-12);
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function iso(ms) {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

function at(day, hour, minute = 0) {
  return START
    + (day * 24 * 60 + hour * 60 + minute - SITE_UTC_OFFSET_MINUTES) * 60_000;
}

function localDate(timestamp) {
  return new Date(timestamp + SITE_UTC_OFFSET_MINUTES * 60_000);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function excelColumn(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function splitFor(timestamp) {
  const progress = (timestamp - START) / (END - START);
  if (progress < 0.7) return "TRAIN";
  if (progress < 0.85) return "VALIDATION";
  return "TEST";
}

const events = [];
let eventCounter = 1;

function addEvent({
  day,
  hour,
  minute = 0,
  preMinutes,
  activeMinutes,
  type,
  targets,
  severity,
  sudden = false,
  rootCause,
  action,
  sourceEventType = type,
  recoveryMinutes,
}) {
  const failureAt = at(day, hour, minute);
  const event = {
    id: `EVT-${String(eventCounter++).padStart(4, "0")}`,
    sourceEventType,
    type,
    targets,
    severity,
    failureAt,
    startAt: failureAt - preMinutes * 60_000,
    endAt: failureAt + activeMinutes * 60_000,
    preMinutes,
    sudden,
    recoveryMinutes: recoveryMinutes ?? variedMinutes(sudden ? 20 : 55, 20, 10),
    curvePower: 0.75 + random() * 0.75,
    magnitudeScale: 0.85 + random() * 0.3,
    rootCause,
    action,
  };
  events.push(event);
  return event;
}

function catalogItem(failureType) {
  return failureCatalog.find((item) => item.failureType === failureType);
}

function addCatalogEvent(options) {
  const item = catalogItem(options.type);
  return addEvent({
    ...options,
    severity: options.severity ?? item.severity,
    rootCause: options.rootCause ?? item.rootCause,
    action: options.action ?? item.action,
  });
}

for (const day of [11, 23, 36, 57, 62, 88, 107, 116, 135, 149, 162, 176]) {
  const clock = randomClock(7, 17);
  const generatorFailure = addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(1_440, 360, 900),
    activeMinutes: variedMinutes(180, 45, 90),
    type: "GEN_LOW_FUEL",
    targets: ["GENERATOR-01"],
  });
  for (const [type, targets] of [
    ["MDP_SUPPLY_LOSS", ["MDP-01"]],
    ["SDP_SUPPLY_LOSS", ["SDP-01", "SDP-02"]],
    ["UPS_INPUT_POWER_LOSS", ["UPS-01", "UPS-02"]],
  ]) {
    const item = catalogItem(type);
    const downstream = addEvent({
      day,
      ...clock,
      preMinutes: 0,
      activeMinutes: generatorFailure.endAt > generatorFailure.failureAt
        ? (generatorFailure.endAt - generatorFailure.failureAt) / 60_000
        : 180,
      type,
      targets,
      severity: item.severity,
      rootCause: `Generator stopped after the fuel level reached the unusable reserve.`,
      action: item.action,
      sourceEventType: "GEN_LOW_FUEL",
    });
    downstream.id = generatorFailure.id;
  }
}
for (const day of [7, 27, 32, 51, 54, 76, 82, 101, 109, 123, 131, 146, 158, 171]) {
  const clock = randomClock(8, 18);
  addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(210, 75, 120),
    activeMinutes: variedMinutes(90, 30, 45),
    type: "GEN_OVERHEAT",
    targets: ["GENERATOR-01"],
  });
}
for (const day of [16, 25, 42, 45, 67, 73, 93, 112, 118, 138, 151, 164, 178]) {
  const clock = randomClock(6, 19);
  addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(165, 60, 90),
    activeMinutes: variedMinutes(70, 25, 30),
    type: "GEN_VOLTAGE_INSTABILITY",
    targets: ["GENERATOR-01"],
  });
}
for (const day of [5, 14, 24, 38, 48, 72, 81, 96, 120, 129, 144, 156, 169]) {
  const clock = randomClock(6, 20);
  addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(210, 75, 120),
    activeMinutes: variedMinutes(90, 30, 45),
    type: "MDP_PHASE_IMBALANCE",
    targets: ["MDP-01"],
  });
}
for (const [index, day] of [6, 19, 26, 33, 54, 64, 70, 90, 109, 114, 124, 133, 147, 160, 173].entries()) {
  const sdp = index % 2 === 0 ? "SDP-01" : "SDP-02";
  const ups = index % 2 === 0 ? "UPS-01" : "UPS-02";
  const clock = randomClock(7, 19);
  const base = addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(240, 90, 120),
    activeMinutes: variedMinutes(95, 30, 45),
    type: "SDP_BREAKER_TRIP",
    targets: [sdp],
  });
  const upsItem = catalogItem("UPS_INPUT_POWER_LOSS");
  addEvent({
    day,
    ...clock,
    preMinutes: 0,
    activeMinutes: (base.endAt - base.failureAt) / 60_000,
    type: "UPS_INPUT_POWER_LOSS",
    targets: [ups],
    severity: upsItem.severity,
    rootCause: `Upstream ${sdp} breaker opened after a sustained overload.`,
    action: upsItem.action,
    sourceEventType: base.sourceEventType,
  }).id = base.id;
}
for (const [index, day] of [14, 25, 38, 59, 73, 82, 106, 113, 121, 137, 143, 158, 175].entries()) {
  const ups = index % 2 === 0 ? "UPS-01" : "UPS-02";
  const clock = randomClock(8, 18);
  addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(1_440, 420, 900),
    activeMinutes: variedMinutes(120, 35, 60),
    type: "UPS_BATTERY_DEGRADATION",
    targets: [ups],
  });
}
for (const [index, day] of [4, 12, 31, 53, 56, 79, 95, 103, 118, 140, 152, 166, 179].entries()) {
  const ups = index % 2 === 0 ? "UPS-02" : "UPS-01";
  const clock = randomClock(7, 19);
  addCatalogEvent({
    day,
    ...clock,
    preMinutes: variedMinutes(210, 90, 90),
    activeMinutes: variedMinutes(90, 30, 45),
    type: "UPS_OVERLOAD",
    targets: [ups],
  });
}

const cascadeDays = [9, 29, 40, 46, 65, 84, 85, 111, 119, 125, 132, 145, 159, 172];
for (const day of cascadeDays) {
  const clock = randomClock(6, 20);
  const activeMinutes = variedMinutes(120, 35, 60);
  const ats = addCatalogEvent({
    day,
    ...clock,
    preMinutes: 0,
    activeMinutes,
    type: "ATS_TRANSFER_FAILURE",
    targets: ["ATS-01"],
    sudden: true,
  });
  for (const [type, targets] of [
    ["MDP_SUPPLY_LOSS", ["MDP-01"]],
    ["SDP_SUPPLY_LOSS", ["SDP-01", "SDP-02"]],
    ["UPS_INPUT_POWER_LOSS", ["UPS-01", "UPS-02"]],
  ]) {
    const item = catalogItem(type);
    const event = addEvent({
      day,
      ...clock,
      preMinutes: 0,
      activeMinutes,
      type,
      targets,
      severity: item.severity,
      rootCause: item.rootCause,
      action: item.action,
      sourceEventType: "ATS_TRANSFER_FAILURE",
    });
    event.id = ats.id;
  }
}

for (const [day, id, type] of [
  [20, "GENERATOR-01", "FIRE_ALARM"],
  [41, "SDP-02", "FIRE_ALARM"],
  [61, "SDP-02", "FIRE_ALARM"],
  [86, "MDP-01", "FIRE_ALARM"],
  [100, "MDP-01", "FIRE_ALARM"],
  [128, "GENERATOR-01", "FIRE_ALARM"],
  [154, "SDP-02", "FIRE_ALARM"],
  [168, "ATS-01", "FIRE_ALARM"],
  [22, "ATS-01", "INTRUDER_ALARM"],
  [58, "ATS-01", "INTRUDER_ALARM"],
  [74, "SDP-01", "INTRUDER_ALARM"],
  [98, "SDP-01", "INTRUDER_ALARM"],
  [104, "GENERATOR-01", "INTRUDER_ALARM"],
  [134, "ATS-01", "INTRUDER_ALARM"],
  [157, "SDP-01", "INTRUDER_ALARM"],
  [174, "MDP-01", "INTRUDER_ALARM"],
]) {
  const item = catalogItem(type);
  const clock = randomClock(0, 23);
  addEvent({
    day,
    ...clock,
    preMinutes: 0,
    activeMinutes: type === "FIRE_ALARM"
      ? variedMinutes(25, 10, 15)
      : variedMinutes(35, 15, 20),
    type,
    targets: [id],
    severity: item.severity,
    sudden: true,
    rootCause: item.rootCause,
    action: item.action,
  });
}

const successfulOutages = [3, 18, 44, 69, 99, 108, 127, 142, 155, 170]
  .map((day, index) => {
    const clock = randomClock(5, 21);
    const startAt = at(day, clock.hour, clock.minute);
    return {
      id: `OPS-${String(index + 1).padStart(3, "0")}`,
      startAt,
      endAt: startAt + variedMinutes(90, 35, 45) * 60_000,
    };
  });

const routineGeneratorTests = [2, 21, 57, 75, 97, 110, 126, 143, 153, 167]
  .map((day, index) => {
    const clock = randomClock(7, 17);
    const startAt = at(day, clock.hour, clock.minute);
    return {
      id: `TEST-${String(index + 1).padStart(3, "0")}`,
      startAt,
      endAt: startAt + variedMinutes(55, 20, 30) * 60_000,
    };
  });

const gridVoltageTransients = [15, 34, 52, 71, 92, 105, 122, 139, 157, 174]
  .map((day, index) => {
    const clock = randomClock(6, 21);
    const startAt = at(day, clock.hour, clock.minute);
    return {
      id: `GRID-${String(index + 1).padStart(3, "0")}`,
      startAt,
      endAt: startAt + variedMinutes(20, 10, 10) * 60_000,
      offsetV: (index % 2 === 0 ? -1 : 1) * (12 + random() * 8),
    };
  });

for (const item of equipment) {
  const itemEvents = events
    .filter((event) => event.targets.includes(item.id))
    .sort((a, b) => a.startAt - b.startAt);
  for (let index = 1; index < itemEvents.length; index += 1) {
    if (itemEvents[index].startAt < itemEvents[index - 1].endAt) {
      throw new Error(
        `Overlapping events for ${item.id}: `
          + `${itemEvents[index - 1].id}/${itemEvents[index - 1].type} `
          + `(${iso(itemEvents[index - 1].startAt)} to ${iso(itemEvents[index - 1].endAt)}) and `
          + `${itemEvents[index].id}/${itemEvents[index].type} `
          + `(${iso(itemEvents[index].startAt)} to ${iso(itemEvents[index].endAt)})`,
      );
    }
  }
}

function eventFor(equipmentId, timestamp) {
  const matches = events.filter(
    (event) =>
      event.targets.includes(equipmentId) &&
      timestamp >= event.startAt &&
      timestamp < event.endAt,
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const aActive = timestamp >= a.failureAt ? 1 : 0;
    const bActive = timestamp >= b.failureAt ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return a.failureAt - b.failureAt;
  });
  return matches[0];
}

function recoveryFor(equipmentId, timestamp) {
  const matches = events.filter(
    (event) =>
      event.targets.includes(equipmentId) &&
      timestamp >= event.endAt &&
      timestamp < event.endAt + event.recoveryMinutes * 60_000,
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.endAt - a.endAt)[0];
}

function recoveryProgress(event, timestamp) {
  if (!event) return 0;
  return clamp(
    1 - (timestamp - event.endAt) / (event.recoveryMinutes * 60_000),
    0,
    1,
  );
}

function cascadeAt(timestamp) {
  return events.find(
    (event) =>
      event.type === "ATS_TRANSFER_FAILURE" &&
      timestamp >= event.failureAt &&
      timestamp < event.endAt,
  );
}

function successfulOutageAt(timestamp) {
  return successfulOutages.find(
    (outage) => timestamp >= outage.startAt && timestamp < outage.endAt,
  );
}

function routineGeneratorTestAt(timestamp) {
  return routineGeneratorTests.find(
    (test) => timestamp >= test.startAt && timestamp < test.endAt,
  );
}

function gridVoltageTransientAt(timestamp) {
  return gridVoltageTransients.find(
    (event) => timestamp >= event.startAt && timestamp < event.endAt,
  );
}

function generatorLowFuelAt(timestamp) {
  return events.find(
    (event) =>
      event.type === "GEN_LOW_FUEL" &&
      timestamp >= event.startAt &&
      timestamp < event.endAt,
  );
}

const generatorState = {
  fuel: 88,
  lowFuelShutdownUntil: null,
  lowFuelEventId: null,
  lowFuelConsumptionPerInterval: 0,
};

function updateGeneratorState(timestamp) {
  const cascade = cascadeAt(timestamp);
  const outage = successfulOutageAt(timestamp);
  const routineTest = routineGeneratorTestAt(timestamp);
  const lowFuel = generatorLowFuelAt(timestamp);
  const generatorEvent = eventFor("GENERATOR-01", timestamp);
  const faultTestRunning = ["GEN_OVERHEAT", "GEN_VOLTAGE_INSTABILITY"].includes(
    generatorEvent?.type,
  );
  const testRunning = faultTestRunning || Boolean(routineTest);
  const sourceDemand = Boolean(cascade || outage || lowFuel);
  let running = sourceDemand || testRunning;
  const enteringLowFuel = Boolean(lowFuel) && generatorState.lowFuelEventId !== lowFuel.id;

  if (enteringLowFuel) {
    generatorState.lowFuelEventId = lowFuel.id;
    generatorState.lowFuelConsumptionPerInterval = Math.max(
      0,
      (generatorState.fuel - 2.5) / (lowFuel.preMinutes / INTERVAL_MINUTES),
    );
  }

  if (
    lowFuel &&
      timestamp >= lowFuel.failureAt &&
      generatorState.lowFuelShutdownUntil !== null &&
      timestamp < generatorState.lowFuelShutdownUntil
  ) {
    running = false;
  }

  if (running) {
    if (lowFuel) {
      if (!enteringLowFuel) {
        generatorState.fuel = clamp(
          generatorState.fuel - generatorState.lowFuelConsumptionPerInterval,
          0,
          100,
        );
      }
    } else {
      generatorState.fuel = clamp(
        generatorState.fuel - 1.4 * (INTERVAL_MINUTES / 60),
        0,
        100,
      );
    }
    if (
      lowFuel &&
      timestamp >= lowFuel.failureAt &&
      generatorState.fuel <= 2.500_001
    ) {
      generatorState.lowFuelShutdownUntil = lowFuel.endAt;
      running = false;
    }
  } else if (!lowFuel && !sourceDemand && !testRunning && generatorState.fuel < 88) {
    generatorState.fuel = clamp(
      generatorState.fuel + 18 * (INTERVAL_MINUTES / 60),
      0,
      88,
    );
  }

  if (!lowFuel && generatorState.lowFuelShutdownUntil !== null) {
    generatorState.lowFuelShutdownUntil = null;
  }
  if (!lowFuel) {
    generatorState.lowFuelEventId = null;
    generatorState.lowFuelConsumptionPerInterval = 0;
  }

  return {
    running,
    loadedTest: testRunning,
    lowFuelShutdown:
      Boolean(lowFuel) &&
      timestamp >= lowFuel.failureAt &&
      generatorState.lowFuelShutdownUntil !== null,
  };
}

function breakerTripForUps(upsId, timestamp) {
  const sdpId = equipment.find((item) => item.id === upsId)?.sdp;
  if (!sdpId) return null;
  return events.find(
    (event) =>
      event.type === "SDP_BREAKER_TRIP" &&
      event.targets.includes(sdpId) &&
      timestamp >= event.failureAt &&
      timestamp < event.endAt,
  );
}

const atsState = {
  activeSource: "MAINS",
  lastSuccessfulTransferAt: null,
};

function withTransferHistory(context, timestamp) {
  if (
    ["MAINS", "GENERATOR"].includes(context.activeSource) &&
    context.activeSource !== atsState.activeSource
  ) {
    atsState.activeSource = context.activeSource;
    atsState.lastSuccessfulTransferAt = iso(timestamp);
  }
  return {
    ...context,
    lastTransferAt: atsState.lastSuccessfulTransferAt,
  };
}

function gridContext(timestamp, generator) {
  const cascade = cascadeAt(timestamp);
  if (cascade) {
    return withTransferHistory({
      eventId: cascade.id,
      mainsVoltage: 0,
      generatorRunning: generator.running,
      generatorVoltage: generator.running ? 230 + gaussian(0, 1.1) : 0,
      activeSource: "NONE",
      transferStatus: "FAILED",
      supplyVoltage: 0,
    }, timestamp);
  }
  const lowFuelRun = generatorLowFuelAt(timestamp);
  if (lowFuelRun) {
    const generatorAvailable = generator.running;
    return withTransferHistory({
      eventId: lowFuelRun.id,
      mainsVoltage: 0,
      generatorRunning: generatorAvailable,
      generatorVoltage: generatorAvailable ? 230 + gaussian(0, 0.9) : 0,
      activeSource: generatorAvailable ? "GENERATOR" : "NONE",
      transferStatus: "NORMAL",
      supplyVoltage: generatorAvailable ? 230 + gaussian(0, 1.0) : 0,
    }, timestamp);
  }
  const outage = successfulOutageAt(timestamp);
  if (outage) {
    return withTransferHistory({
      eventId: outage.id,
      mainsVoltage: 0,
      generatorRunning: generator.running,
      generatorVoltage: generator.running ? 230 + gaussian(0, 0.9) : 0,
      activeSource: generator.running ? "GENERATOR" : "NONE",
      transferStatus: "NORMAL",
      supplyVoltage: generator.running ? 230 + gaussian(0, 1.0) : 0,
    }, timestamp);
  }
  const hour = localDate(timestamp).getUTCHours();
  const dailyVariation = 1.5 * Math.sin(((hour - 4) / 24) * 2 * Math.PI);
  const transient = gridVoltageTransientAt(timestamp);
  const transientOffset = transient?.offsetV ?? 0;
  return withTransferHistory({
    eventId: null,
    mainsVoltage: 230 + dailyVariation + transientOffset + gaussian(0, 0.8),
    generatorRunning: generator.running,
    generatorVoltage: 0,
    activeSource: "MAINS",
    transferStatus: "NORMAL",
    supplyVoltage: 230 + dailyVariation + transientOffset + gaussian(0, 0.6),
  }, timestamp);
}

function baseLoad(timestamp, base, amplitude) {
  const date = localDate(timestamp);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const daytime = Math.max(0, Math.sin(((hour - 6) / 24) * 2 * Math.PI));
  const weekday = date.getUTCDay();
  const weekdayFactor = weekday === 0 || weekday === 6 ? 0.88 : 1;
  return (base + amplitude * daytime) * weekdayFactor;
}

function emptySensorValues() {
  const values = {};
  const firstSensor = columns.indexOf("voltage_L1");
  const lastSensor = columns.indexOf("battery_discharge_rate_pct_per_hour");
  for (const name of columns.slice(firstSensor, lastSensor + 1)) values[name] = null;
  return values;
}

function eventProgress(event, timestamp) {
  if (!event) return 0;
  if (timestamp >= event.failureAt) return 1;
  const linearProgress = clamp(
    (timestamp - event.startAt) / (event.failureAt - event.startAt),
    0,
    1,
  );
  return linearProgress ** event.curvePower;
}

function threePhaseVoltages(base, spread = 0.7) {
  return [
    base + gaussian(0, spread),
    base + gaussian(0, spread),
    base + gaussian(0, spread),
  ];
}

function threePhaseCurrents(base, spread = 1.2) {
  return [
    Math.max(0, base + gaussian(0, spread)),
    Math.max(0, base + gaussian(0, spread)),
    Math.max(0, base + gaussian(0, spread)),
  ];
}

function setPhaseDerived(row, voltages, currents, zeroOutputIsNormal = false) {
  if (voltages.some((value) => value === null)) return;
  const maxVoltage = Math.max(...voltages);
  const minVoltage = Math.min(...voltages);
  const avgVoltage = voltages.reduce((sum, value) => sum + value, 0) / voltages.length;
  row.phase_voltage_imbalance_v = round(maxVoltage - minVoltage);
  row.voltage_deviation_pct = zeroOutputIsNormal && avgVoltage < 1
    ? 0
    : round((Math.abs(avgVoltage - 230) / 230) * 100);
  if (!currents.some((value) => value === null)) {
    const avgCurrent = currents.reduce((sum, value) => sum + value, 0) / currents.length;
    const spread = Math.max(...currents) - Math.min(...currents);
    row.phase_current_imbalance_pct =
      avgCurrent > 0.05 ? round((spread / avgCurrent) * 100) : 0;
  }
}

const upsState = new Map(equipment
  .filter((item) => item.type === "UPS")
  .map((item) => [item.id, { charge: 96 }]));

function generatorSensors(timestamp, event, recovery, grid, generator) {
  const row = emptySensorValues();
  const progress = eventProgress(event, timestamp);
  const recoveryLevel = recoveryProgress(recovery, timestamp);
  const running = generator.running;
  const connectedToLoad = running
    && (grid.activeSource === "GENERATOR" || generator.loadedTest);

  const load = connectedToLoad ? baseLoad(timestamp, 38, 13) : 0;
  let voltageBase = running ? 230 : 0;
  let voltageSpread = running ? 0.9 : 0;
  let frequency = running ? 50 + gaussian(0, 0.06) : 0;
  let temperature = running ? 31 + load * 0.08 + gaussian(0, 0.45) : 28 + gaussian(0, 0.5);
  let status = running ? "RUNNING" : "STANDBY";
  const breaker = connectedToLoad ? "CLOSED" : "OPEN";

  if (event?.type === "GEN_LOW_FUEL") {
    if (generator.lowFuelShutdown) status = "FAULT";
  } else if (event?.type === "GEN_OVERHEAT") {
    temperature = 34 + 20 * event.magnitudeScale * progress + gaussian(0, 0.35);
    frequency += progress * gaussian(0, 0.35);
    voltageSpread = 0.9 + progress * 3.8 * event.magnitudeScale;
    if (timestamp >= event.failureAt) status = "FAULT";
  } else if (event?.type === "GEN_VOLTAGE_INSTABILITY") {
    voltageBase = 230 - 27 * event.magnitudeScale * progress;
    voltageSpread = 1 + 9 * event.magnitudeScale * progress;
    frequency = 50 - 2.4 * event.magnitudeScale * progress
      + gaussian(0, 0.12 + progress * 0.25);
    if (timestamp >= event.failureAt) status = "FAULT";
  }
  if (!event && recovery?.type === "GEN_OVERHEAT") {
    temperature += 13 * recovery.magnitudeScale * recoveryLevel;
  }

  const voltages = running
    ? threePhaseVoltages(voltageBase, voltageSpread)
    : [0, 0, 0];
  const currents = running
    && connectedToLoad
    ? threePhaseCurrents(load, 1.0 + progress * 1.5)
    : [0, 0, 0];

  [
    row.voltage_L1,
    row.voltage_L2,
    row.voltage_L3,
  ] = voltages.map((value) => round(value));
  [
    row.current_L1,
    row.current_L2,
    row.current_L3,
  ] = currents.map((value) => round(value));
  row.fuel_level_pct = round(clamp(generatorState.fuel + gaussian(0, 0.08), 0, 100));
  row.frequency_hz = round(frequency);
  row.running_status = status;
  row.breaker_status = breaker;
  row.room_temperature_c = round(temperature);
  row.intruder_alarm = event?.type === "INTRUDER_ALARM" && timestamp >= event.failureAt;
  row.fire_alarm = event?.type === "FIRE_ALARM" && timestamp >= event.failureAt;
  setPhaseDerived(row, voltages, currents, !running);
  return row;
}

function atsSensors(timestamp, event, grid) {
  const row = emptySensorValues();
  row.active_source = grid.activeSource;
  row.mains_voltage = round(grid.mainsVoltage);
  row.generator_voltage = round(grid.generatorVoltage);
  row.transfer_status = grid.transferStatus;
  row.breaker_status = grid.activeSource === "NONE" ? "OPEN" : "CLOSED";
  row.last_transfer_at = grid.lastTransferAt;
  row.room_temperature_c = round(27 + gaussian(0, 0.45));
  row.intruder_alarm = event?.type === "INTRUDER_ALARM" && timestamp >= event.failureAt;
  row.fire_alarm = event?.type === "FIRE_ALARM" && timestamp >= event.failureAt;
  row.voltage_deviation_pct = round(
    (Math.abs((grid.activeSource === "GENERATOR" ? grid.generatorVoltage : grid.mainsVoltage) - 230) /
      230) *
      100,
  );
  return row;
}

function panelSensors(timestamp, event, recovery, grid, equipmentType, equipmentId) {
  const row = emptySensorValues();
  const progress = eventProgress(event, timestamp);
  const recoveryLevel = recoveryProgress(recovery, timestamp);
  const isMdp = equipmentType === "MDP";
  const baseCurrent = baseLoad(timestamp, isMdp ? 62 : equipmentId === "SDP-01" ? 27 : 23, isMdp ? 24 : 13);
  let supply = grid.supplyVoltage;
  let currentBase = baseCurrent;
  let temperature = 28 + currentBase * 0.035 + gaussian(0, 0.45);
  let breaker = supply > 1 ? "CLOSED" : "OPEN";
  let voltages = threePhaseVoltages(supply, supply > 1 ? 0.75 : 0);
  let currents = supply > 1 ? threePhaseCurrents(currentBase, 1.2) : [0, 0, 0];

  if (event?.type === "MDP_PHASE_IMBALANCE") {
    voltages[0] -= 22 * event.magnitudeScale * progress;
    voltages[1] += 4 * event.magnitudeScale * progress;
    currents[0] += 22 * event.magnitudeScale * progress;
    currents[2] -= 8 * event.magnitudeScale * progress;
    temperature += 8 * event.magnitudeScale * progress;
  } else if (event?.type === "SDP_BREAKER_TRIP") {
    currentBase += 52 * event.magnitudeScale * progress;
    currents = threePhaseCurrents(currentBase, 2.0 + 2.5 * progress);
    temperature += 16 * event.magnitudeScale * progress;
    if (timestamp >= event.failureAt) {
      supply = 0;
      voltages = [0, 0, 0];
      currents = [0, 0, 0];
      breaker = "OPEN";
    }
  } else if (["MDP_SUPPLY_LOSS", "SDP_SUPPLY_LOSS"].includes(event?.type)) {
    supply = 0;
    voltages = [0, 0, 0];
    currents = [0, 0, 0];
    breaker = "OPEN";
  }
  if (
    !event
    && ["MDP_PHASE_IMBALANCE", "SDP_BREAKER_TRIP"].includes(recovery?.type)
  ) {
    temperature += 7 * recovery.magnitudeScale * recoveryLevel;
  }

  [row.voltage_R, row.voltage_Y, row.voltage_B] = voltages.map((value) => round(value));
  [row.current_R, row.current_Y, row.current_B] = currents.map((value) => round(value));
  if (isMdp) row.main_breaker_status = breaker;
  else row.breaker_status = breaker;
  row.room_temperature_c = round(temperature);
  row.intruder_alarm = event?.type === "INTRUDER_ALARM" && timestamp >= event.failureAt;
  row.fire_alarm = event?.type === "FIRE_ALARM" && timestamp >= event.failureAt;
  setPhaseDerived(row, voltages, currents);
  return row;
}

function upsSensors(timestamp, event, recovery, grid, equipmentId) {
  const row = emptySensorValues();
  const progress = eventProgress(event, timestamp);
  const recoveryLevel = recoveryProgress(recovery, timestamp);
  const localTrip = breakerTripForUps(equipmentId, timestamp);
  const inputLost = grid.supplyVoltage < 1 || Boolean(localTrip);
  const loadBase = baseLoad(timestamp, equipmentId === "UPS-01" ? 42 : 37, 14);
  let load = loadBase + gaussian(0, 0.8);
  const state = upsState.get(equipmentId);
  let charge = state.charge;
  let batteryVoltage = 52.2 + gaussian(0, 0.08);
  const normalFullRuntime = clamp(6_000 / Math.max(load, 10), 45, 180);
  let runtime = (charge / 100) * normalFullRuntime + gaussian(0, 1.4);
  let temperature = 27 + load * 0.055 + gaussian(0, 0.35);
  let operationalStatus = "ONLINE";
  let faultCode = null;
  let inputVoltage = grid.supplyVoltage;
  let outputVoltage = 230 + gaussian(0, 0.45);

  if (inputLost) {
    operationalStatus = "ON_BATTERY";
    inputVoltage = 0;
    const fullRuntime = clamp(6_000 / Math.max(load, 10), 45, 180);
    state.charge = clamp(
      state.charge - (100 * INTERVAL_MINUTES) / fullRuntime,
      0,
      100,
    );
    charge = state.charge;
    batteryVoltage = 48.4 + charge * 0.039 + gaussian(0, 0.06);
    runtime = clamp((charge / 100) * fullRuntime + gaussian(0, 0.8), 0, 180);
    if (charge < 20) faultCode = "BATTERY_CRITICAL";
    if (charge < 8) {
      operationalStatus = "FAULT";
      outputVoltage = 0;
      faultCode = "BATTERY_EXHAUSTED";
    }
  } else {
    state.charge = clamp(
      state.charge + (state.charge < 90 ? 6 : 1.2) * (INTERVAL_MINUTES / 60),
      0,
      96,
    );
    charge = state.charge;
  }

  if (event?.type === "UPS_BATTERY_DEGRADATION") {
    operationalStatus = timestamp >= event.failureAt ? "FAULT" : "ONLINE";
    charge = state.charge;
    batteryVoltage = 52.1 - 4.6 * event.magnitudeScale * progress + gaussian(0, 0.06);
    runtime = 82 - 68 * event.magnitudeScale * progress + gaussian(0, 0.8);
    temperature += 7 * event.magnitudeScale * progress;
    if (timestamp >= event.failureAt) faultCode = "BATTERY_CAPACITY_LOW";
  } else if (event?.type === "UPS_OVERLOAD") {
    load = 58 + 43 * event.magnitudeScale * progress + gaussian(0, 0.7);
    runtime = clamp(
      (charge / 100) * clamp(6_000 / Math.max(load, 10), 45, 180)
        - 22 * event.magnitudeScale * progress
        + gaussian(0, 1),
      2,
      180,
    );
    temperature += 13 * event.magnitudeScale * progress;
    if (timestamp >= event.failureAt) {
      operationalStatus = "FAULT";
      faultCode = "OUTPUT_OVERLOAD";
    }
  } else if (event?.type === "UPS_INPUT_POWER_LOSS") {
    operationalStatus = inputLost ? operationalStatus : "ON_BATTERY";
  }
  if (!event && recovery?.type === "UPS_OVERLOAD") {
    load += 18 * recovery.magnitudeScale * recoveryLevel;
    temperature += 7 * recovery.magnitudeScale * recoveryLevel;
    runtime = clamp(
      (charge / 100) * clamp(6_000 / Math.max(load, 10), 45, 180)
        + gaussian(0, 1),
      0,
      180,
    );
  } else if (!event && recovery?.type === "UPS_BATTERY_DEGRADATION") {
    temperature += 4 * recovery.magnitudeScale * recoveryLevel;
  }

  row.operational_status = operationalStatus;
  row.battery_charge_pct = round(clamp(charge + gaussian(0, 0.06), 0, 100));
  row.battery_voltage_v = round(Math.max(0, batteryVoltage));
  row.input_voltage_v = round(Math.max(0, inputVoltage));
  row.output_voltage_v = round(Math.max(0, outputVoltage));
  row.load_pct = round(clamp(load, 0, 120));
  row.estimated_runtime_min = round(Math.max(0, runtime), 1);
  row.temperature_c = round(temperature);
  row.fault_code = faultCode;
  row.voltage_deviation_pct = round((Math.abs(outputVoltage - 230) / 230) * 100);
  return row;
}

function targetValues(event, timestamp) {
  if (!event) {
    return {
      target_failure_within_15_min: 0,
      target_failure_within_60_min: 0,
      target_failure_within_6_hours: 0,
      target_time_to_failure_min: null,
      target_fault_active: 0,
      target_failure_type: null,
      target_risk_level: "NORMAL",
      target_maintenance_required: 0,
    };
  }
  const active = timestamp >= event.failureAt;
  const minutes = active ? 0 : Math.max(0, Math.round((event.failureAt - timestamp) / 60_000));
  const emergencyResponse = ["FIRE_ALARM", "INTRUDER_ALARM"].includes(event.type);
  let riskLevel = "NORMAL";
  if (active) {
    riskLevel = event.type === "GEN_LOW_FUEL" ? "CRITICAL" : event.severity;
  } else if (!event.sudden && minutes <= 15 && event.severity === "CRITICAL") {
    riskLevel = "CRITICAL";
  } else if (!event.sudden && minutes <= 360) {
    riskLevel = "WARNING";
  }
  const maintenanceRequired = !emergencyResponse
    && (active || (!event.sudden && minutes <= 360));
  return {
    target_failure_within_15_min:
      active ? null : !event.sudden && minutes <= 15 ? 1 : 0,
    target_failure_within_60_min:
      active ? null : !event.sudden && minutes <= 60 ? 1 : 0,
    target_failure_within_6_hours:
      active ? null : !event.sudden && minutes <= 360 ? 1 : 0,
    target_time_to_failure_min: active || event.sudden ? null : minutes,
    target_fault_active: active ? 1 : 0,
    target_failure_type: event.type,
    target_risk_level: riskLevel,
    target_maintenance_required: maintenanceRequired ? 1 : 0,
  };
}

function operatingState(type, sensors) {
  if (type === "GENERATOR") return sensors.running_status;
  if (type === "ATS") {
    if (sensors.transfer_status === "FAILED") return "FAULT";
    if (sensors.active_source === "NONE") return "NO_SUPPLY";
    return sensors.active_source === "GENERATOR" ? "GENERATOR_SUPPLY" : "MAINS_SUPPLY";
  }
  if (type === "MDP") return sensors.main_breaker_status === "CLOSED" ? "ENERGIZED" : "DEENERGIZED";
  if (type === "SDP") return sensors.breaker_status === "CLOSED" ? "ENERGIZED" : "DEENERGIZED";
  return sensors.operational_status;
}

function applyRates(row, history) {
  const previous = history.length >= 12 ? history[history.length - 12] : null;
  const hours = previous
    ? (Date.parse(row.timestamp_utc) - Date.parse(previous.timestamp_utc)) / 3_600_000
    : null;
  const currentTemp = row.temperature_c ?? row.room_temperature_c;
  const previousTemp = previous?.temperature_c ?? previous?.room_temperature_c;
  if (currentTemp !== null && currentTemp !== undefined) {
    row.temperature_change_c_per_hour = 0;
  }
  if (row.load_pct !== null && row.load_pct !== undefined) {
    row.load_change_pct_per_hour = 0;
  }
  if (row.battery_charge_pct !== null && row.battery_charge_pct !== undefined) {
    row.battery_discharge_rate_pct_per_hour = 0;
  }
  if (hours && currentTemp !== null && previousTemp !== null && previousTemp !== undefined) {
    row.temperature_change_c_per_hour = round((currentTemp - previousTemp) / hours);
  }
  if (hours && row.load_pct !== null && previous?.load_pct !== null && previous?.load_pct !== undefined) {
    row.load_change_pct_per_hour = round((row.load_pct - previous.load_pct) / hours);
  }
  if (
    hours &&
    row.battery_charge_pct !== null &&
    previous?.battery_charge_pct !== null &&
    previous?.battery_charge_pct !== undefined
  ) {
    row.battery_discharge_rate_pct_per_hour = round(
      Math.max(0, (previous.battery_charge_pct - row.battery_charge_pct) / hours),
    );
  }
}

const statsByType = Object.fromEntries(
  ["GENERATOR", "ATS", "MDP", "SDP", "UPS"].map((type) => [
    type,
    { records: 0, active: 0, within60: 0, within6h: 0, maintenance: 0 },
  ]),
);
const splitCounts = { TRAIN: 0, VALIDATION: 0, TEST: 0 };
const failureCounts = new Map();
const historyByEquipment = new Map(equipment.map((item) => [item.id, []]));
const sampleRows = [];
const eventBoundarySamples = [];

await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(byTypeDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const catalogCsv = [
  ["failure_type", "subsystem", "severity", "observable_pattern", "probable_root_cause", "recommended_action"],
  ...failureCatalog.map((item) => [
    item.failureType, item.subsystem, item.severity, item.precursor, item.rootCause, item.action,
  ]),
].map((row) => row.map(csvCell).join(",")).join("\n");
await fs.writeFile(catalogCsvPath, `${catalogCsv}\n`);
await fs.writeFile(
  featureConfigPath,
  `${JSON.stringify({
    metadata_columns: metadataColumns,
    feature_columns_by_equipment_type: featureColumnsByType,
    target_columns: targetColumns,
    training_tasks: {
      failure_prediction_15_min: {
        target_column: "target_failure_within_15_min",
        row_filters: { target_fault_active: 0 },
        supported_equipment_types: ["GENERATOR", "MDP", "SDP", "UPS"],
      },
      failure_prediction_60_min: {
        target_column: "target_failure_within_60_min",
        row_filters: { target_fault_active: 0 },
        supported_equipment_types: ["GENERATOR", "MDP", "SDP", "UPS"],
      },
      failure_prediction_6_hours: {
        target_column: "target_failure_within_6_hours",
        row_filters: { target_fault_active: 0 },
        supported_equipment_types: ["GENERATOR", "MDP", "SDP", "UPS"],
      },
      active_fault_detection: {
        target_column: "target_fault_active",
        row_filters: {},
        supported_equipment_types: ["GENERATOR", "ATS", "MDP", "SDP", "UPS"],
      },
      active_fault_diagnosis: {
        target_column: "target_failure_type",
        row_filters: { target_fault_active: 1 },
        supported_equipment_types: ["GENERATOR", "ATS", "MDP", "SDP", "UPS"],
      },
      time_to_failure_regression: {
        target_column: "target_time_to_failure_min",
        row_filters: {
          target_fault_active: 0,
          target_time_to_failure_min: "NOT_NULL",
        },
        supported_equipment_types: ["GENERATOR", "MDP", "SDP", "UPS"],
      },
      risk_level_classification: {
        target_column: "target_risk_level",
        row_filters: {},
        supported_equipment_types: ["GENERATOR", "ATS", "MDP", "SDP", "UPS"],
      },
      maintenance_prediction: {
        target_column: "target_maintenance_required",
        row_filters: { target_fault_active: 0 },
        supported_equipment_types: ["GENERATOR", "ATS", "MDP", "SDP", "UPS"],
      },
    },
    output_columns_by_equipment_type: outputColumnsByType,
    row_filter_operators: {
      NOT_NULL: "Keep rows where the named column has a value.",
    },
    solution_catalog: "fault_solution_catalog.csv",
    training_rule:
      "Select one equipment type, apply the selected task row filters, use only its feature whitelist, and fit on TRAIN rows.",
    missing_target_rule:
      "Blank future-failure targets mean the equipment is already in an active fault or the failure is sudden; apply each task's row filters before training.",
  }, null, 2)}\n`,
);

const file = await fs.open(csvPath, "w");
await file.write(`${columns.join(",")}\n`);
const typeFiles = {};
const typeBuffers = {};
const byTypePaths = {};
for (const type of Object.keys(featureColumnsByType)) {
  const typePath = path.join(
    byTypeDir,
    `${type.toLowerCase()}_training_dataset.csv`,
  );
  const typeFile = await fs.open(typePath, "w");
  await typeFile.write(`${outputColumnsByType[type].join(",")}\n`);
  typeFiles[type] = typeFile;
  typeBuffers[type] = [];
  byTypePaths[type] = typePath;
}

let recordId = 1;
let lineBuffer = [];
for (let timestamp = START; timestamp < END; timestamp += INTERVAL_MS) {
  const generator = updateGeneratorState(timestamp);
  const grid = gridContext(timestamp, generator);
  for (const item of equipment) {
    const event = eventFor(item.id, timestamp);
    const recovery = event ? null : recoveryFor(item.id, timestamp);
    let sensors;
    if (item.type === "GENERATOR") {
      sensors = generatorSensors(timestamp, event, recovery, grid, generator);
    }
    else if (item.type === "ATS") sensors = atsSensors(timestamp, event, grid);
    else if (item.type === "MDP" || item.type === "SDP") {
      sensors = panelSensors(timestamp, event, recovery, grid, item.type, item.id);
    } else sensors = upsSensors(timestamp, event, recovery, grid, item.id);

    const split = splitFor(timestamp);
    const target = targetValues(event, timestamp);
    const siteLocalDate = localDate(timestamp);
    const siteLocalHour = siteLocalDate.getUTCHours()
      + siteLocalDate.getUTCMinutes() / 60;
    const row = {
      record_id: recordId,
      timestamp_utc: iso(timestamp),
      site_id: SITE_ID,
      equipment_id: item.id,
      equipment_type: item.type,
      location: item.location,
      operating_state: operatingState(item.type, sensors),
      data_split: split,
      hour_sin: round(Math.sin((siteLocalHour / 24) * 2 * Math.PI), 6),
      hour_cos: round(Math.cos((siteLocalHour / 24) * 2 * Math.PI), 6),
      day_of_week_sin: round(
        Math.sin((siteLocalDate.getUTCDay() / 7) * 2 * Math.PI),
        6,
      ),
      day_of_week_cos: round(
        Math.cos((siteLocalDate.getUTCDay() / 7) * 2 * Math.PI),
        6,
      ),
      ...sensors,
      ...target,
    };
    const history = historyByEquipment.get(item.id);
    applyRates(row, history);
    history.push(row);
    if (history.length > 12) history.shift();

    const stat = statsByType[item.type];
    stat.records += 1;
    stat.active += row.target_fault_active;
    stat.within60 += row.target_failure_within_60_min;
    stat.within6h += row.target_failure_within_6_hours;
    stat.maintenance += row.target_maintenance_required;
    splitCounts[split] += 1;
    if (row.target_failure_type && row.target_fault_active) {
      failureCounts.set(
        row.target_failure_type,
        (failureCounts.get(row.target_failure_type) ?? 0) + 1,
      );
    }

    const values = columns.map((name) => row[name] ?? null);
    lineBuffer.push(values.map(csvCell).join(","));
    const typeValues = outputColumnsByType[item.type].map((name) => row[name] ?? null);
    typeBuffers[item.type].push(typeValues.map(csvCell).join(","));
    if (lineBuffer.length >= 2_000) {
      await file.write(`${lineBuffer.join("\n")}\n`);
      lineBuffer = [];
    }
    if (typeBuffers[item.type].length >= 1_000) {
      await typeFiles[item.type].write(`${typeBuffers[item.type].join("\n")}\n`);
      typeBuffers[item.type] = [];
    }

    if (recordId % 1_000 === 0 && sampleRows.length < 350) sampleRows.push(values);
    if (
      event &&
      Math.abs(timestamp - event.failureAt) <= 15 * 60_000 &&
      eventBoundarySamples.length < 1_650
    ) {
      eventBoundarySamples.push(values);
    }
    recordId += 1;
  }
}
if (lineBuffer.length) await file.write(`${lineBuffer.join("\n")}\n`);
await file.close();
for (const type of Object.keys(typeFiles)) {
  if (typeBuffers[type].length) {
    await typeFiles[type].write(`${typeBuffers[type].join("\n")}\n`);
  }
  await typeFiles[type].close();
}

const totalRecords = recordId - 1;
const workbook = Workbook.create();
const overview = workbook.worksheets.add("Overview");
const qa = workbook.worksheets.add("QA Summary");
const dictionary = workbook.worksheets.add("Data Dictionary");
const catalog = workbook.worksheets.add("Failure Catalog");
const sources = workbook.worksheets.add("Sources");
const sample = workbook.worksheets.add("Dataset Sample");

const dark = "#17324D";
const teal = "#167D7F";
const paleBlue = "#EAF3F8";
const paleGreen = "#E8F4EE";
const paleAmber = "#FFF3D6";
const paleRed = "#FCE8E6";
const lightBorder = "#C8D6E0";
const bodyFont = "Aptos";
const titleFont = "Aptos Display";

function styleTitle(sheet, range) {
  range.format = {
    fill: dark,
    font: { bold: true, color: "#FFFFFF", size: 16, name: titleFont },
    verticalAlignment: "center",
  };
  range.format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: teal,
    font: { bold: true, color: "#FFFFFF", name: bodyFont },
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: lightBorder },
  };
  range.format.rowHeight = 28;
}

function styleBody(range) {
  range.format = {
    font: { name: bodyFont, size: 10 },
    verticalAlignment: "top",
    borders: {
      insideHorizontal: { style: "thin", color: "#E5EDF2" },
      bottom: { style: "thin", color: "#E5EDF2" },
    },
  };
}

overview.showGridLines = false;
overview.getRange("A1:F1").merge();
overview.getRange("A1").values = [["Expressway Power Training Dataset"]];
styleTitle(overview, overview.getRange("A1:F1"));
overview.getRange("A3:B10").values = [
  ["Metric", "Value"],
  ["Dataset period", `${iso(START)} to ${iso(END - INTERVAL_MS)}`],
  ["Sampling interval", `${INTERVAL_MINUTES} minutes`],
  ["Equipment records", null],
  ["Equipment units", equipment.length],
  ["Failure events", new Set(events.map((event) => event.id)).size],
  ["60-minute pre-failure rows", null],
  ["Active-fault rows", null],
];
styleHeader(overview.getRange("A3:B3"));
styleBody(overview.getRange("A4:B10"));
overview.getRange("B6").formulas = [["=SUM('QA Summary'!B2:B6)"]];
overview.getRange("B9").formulas = [["=SUM('QA Summary'!D2:D6)"]];
overview.getRange("B10").formulas = [["=SUM('QA Summary'!C2:C6)"]];
overview.getRange("A12:F12").values = [[
  "Design rule",
  "Normal operation",
  "Pre-failure",
  "Active fault",
  "Recovery",
  "Training split",
]];
styleHeader(overview.getRange("A12:F12"));
overview.getRange("A13:F13").values = [[
  "Time-series states are kept in chronological order.",
  "Includes load cycles, safe voltage transients, routine tests, noise, standby states and source transfers.",
  "Gradual drift is labelled only before predictable failures.",
  "Sudden alarms remain sudden and do not receive artificial warning labels.",
  "Temperature and load signals recover gradually after the event window.",
  "70% train, 15% validation, 15% test by time.",
]];
overview.getRange("A13:F13").format = {
  fill: paleBlue,
  font: { name: bodyFont, size: 10 },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: lightBorder },
};
overview.getRange("A13:F13").format.rowHeight = 65;
overview.getRange("A:A").format.columnWidth = 25;
overview.getRange("B:B").format.columnWidth = 28;
overview.getRange("C:F").format.columnWidth = 25;

qa.showGridLines = false;
qa.getRange("A1:F1").values = [[
  "Equipment Type",
  "Records",
  "Active Fault Rows",
  "Failure Within 60 Min",
  "Failure Within 6 Hours",
  "Maintenance-labelled Rows",
]];
styleHeader(qa.getRange("A1:F1"));
const qaRows = Object.entries(statsByType).map(([type, stat]) => [
  type,
  stat.records,
  stat.active,
  stat.within60,
  stat.within6h,
  stat.maintenance,
]);
qa.getRange(`A2:F${qaRows.length + 1}`).values = qaRows;
styleBody(qa.getRange(`A2:F${qaRows.length + 1}`));
qa.getRange(`B2:F${qaRows.length + 1}`).format.numberFormat = "#,##0";
qa.getRange("H1:I1").values = [["Split", "Rows"]];
styleHeader(qa.getRange("H1:I1"));
qa.getRange("H2:I4").values = Object.entries(splitCounts);
styleBody(qa.getRange("H2:I4"));
qa.getRange("I2:I4").format.numberFormat = "#,##0";
qa.getRange("K1:L1").values = [["Active Failure Type", "Rows"]];
styleHeader(qa.getRange("K1:L1"));
const activeFailureRows = [...failureCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
qa.getRange(`K2:L${activeFailureRows.length + 1}`).values = activeFailureRows;
styleBody(qa.getRange(`K2:L${activeFailureRows.length + 1}`));
qa.getRange("A:A").format.columnWidth = 19;
qa.getRange("B:F").format.columnWidth = 20;
qa.getRange("H:H").format.columnWidth = 17;
qa.getRange("I:I").format.columnWidth = 15;
qa.getRange("K:K").format.columnWidth = 30;
qa.getRange("L:L").format.columnWidth = 15;
qa.freezePanes.freezeRows(1);

const dictionaryRows = [
  ["record_id", "Identifier", "", "Unique sequential observation identifier."],
  ["timestamp_utc", "Time", "ISO 8601 UTC", "Observation timestamp at a fixed five-minute interval."],
  ["site_id", "Identifier", "", "Expressway site identifier."],
  ["equipment_id", "Identifier", "", "Equipment code matching the backend equipment registry."],
  ["equipment_type", "Category", "", "GENERATOR, ATS, MDP, SDP or UPS."],
  ["location", "Category", "", "Physical equipment location."],
  ["operating_state", "Feature", "", "Current operating condition interpreted for the equipment type."],
  ["data_split", "Partition", "", "Chronological TRAIN, VALIDATION or TEST partition."],
  ["hour_sin/hour_cos", "Derived feature", "", "Cyclical encoding of Asia/Colombo local time of day."],
  ["day_of_week_sin/day_of_week_cos", "Derived feature", "", "Cyclical encoding of Asia/Colombo local day of week."],
  ["voltage_L1/L2/L3", "Feature", "V", "Generator line-to-neutral phase voltages."],
  ["current_L1/L2/L3", "Feature", "A", "Generator phase currents."],
  ["fuel_level_pct", "Feature", "%", "Generator fuel tank level."],
  ["frequency_hz", "Feature", "Hz", "Generator output frequency; zero while in standby."],
  ["running_status", "Feature", "", "Generator STANDBY, RUNNING or FAULT state."],
  ["breaker_status", "Feature", "", "Breaker OPEN or CLOSED state for Generator, ATS or SDP."],
  ["room_temperature_c", "Feature", "deg C", "Generator, ATS, MDP or SDP room/cabinet temperature."],
  ["intruder_alarm", "Feature", "boolean", "Digital intrusion alarm state."],
  ["fire_alarm", "Feature", "boolean", "Digital fire alarm state."],
  ["active_source", "Feature", "", "ATS source: MAINS, GENERATOR or NONE."],
  ["mains_voltage", "Feature", "V", "ATS utility source voltage."],
  ["generator_voltage", "Feature", "V", "ATS generator source voltage."],
  ["transfer_status", "Feature", "", "ATS transfer state."],
  ["last_transfer_at", "Feature", "ISO 8601 UTC", "Most recent successful source transfer timestamp when applicable."],
  ["voltage_R/Y/B", "Feature", "V", "MDP or SDP phase voltages."],
  ["current_R/Y/B", "Feature", "A", "MDP or SDP phase currents."],
  ["main_breaker_status", "Feature", "", "MDP main breaker state."],
  ["operational_status", "Feature", "", "UPS ONLINE, ON_BATTERY or FAULT state."],
  ["battery_charge_pct", "Feature", "%", "UPS remaining battery charge."],
  ["battery_voltage_v", "Feature", "V", "UPS battery-string voltage represented by the project schema."],
  ["input_voltage_v", "Feature", "V", "UPS input voltage."],
  ["output_voltage_v", "Feature", "V", "UPS output voltage."],
  ["load_pct", "Feature", "%", "UPS output load percentage."],
  ["estimated_runtime_min", "Feature", "min", "UPS estimated remaining runtime."],
  ["temperature_c", "Feature", "deg C", "UPS internal/ambient temperature."],
  ["fault_code", "Feature", "", "UPS fault code when a device fault is active."],
  ["phase_voltage_imbalance_v", "Derived feature", "V", "Maximum phase voltage minus minimum phase voltage."],
  ["phase_current_imbalance_pct", "Derived feature", "%", "Phase-current spread divided by mean current."],
  ["voltage_deviation_pct", "Derived feature", "%", "Absolute mean voltage deviation from 230 V."],
  ["temperature_change_c_per_hour", "Derived feature", "deg C/h", "Temperature change over a trailing one-hour window."],
  ["load_change_pct_per_hour", "Derived feature", "%/h", "UPS load change over a trailing one-hour window."],
  ["battery_discharge_rate_pct_per_hour", "Derived feature", "%/h", "Positive UPS charge decline over a trailing one-hour window."],
  ["target_failure_within_15_min", "Target", "0/1/blank", "Predictable failure begins within the next 15 minutes; blank during an active fault."],
  ["target_failure_within_60_min", "Target", "0/1/blank", "Predictable failure begins within the next 60 minutes; blank during an active fault."],
  ["target_failure_within_6_hours", "Target", "0/1/blank", "Predictable failure begins within the next six hours; blank during an active fault."],
  ["target_time_to_failure_min", "Target", "min/blank", "Minutes to predictable failure onset; blank during an active or sudden fault."],
  ["target_fault_active", "Target", "0/1", "Fault is active at this timestamp."],
  ["target_failure_type", "Target", "", "Failure category to predict."],
  ["target_risk_level", "Target", "", "NORMAL, WARNING or CRITICAL."],
  ["target_maintenance_required", "Target", "0/1", "Equipment maintenance is required now or within the six-hour planning horizon; emergency and security responses are excluded."],
];
dictionary.showGridLines = false;
dictionary.getRange("A1:D1").values = [["Column", "Role", "Unit / Values", "Definition"]];
styleHeader(dictionary.getRange("A1:D1"));
dictionary.getRange(`A2:D${dictionaryRows.length + 1}`).values = dictionaryRows;
styleBody(dictionary.getRange(`A2:D${dictionaryRows.length + 1}`));
dictionary.getRange(`D2:D${dictionaryRows.length + 1}`).format.wrapText = true;
dictionary.getRange("A:A").format.columnWidth = 36;
dictionary.getRange("B:B").format.columnWidth = 18;
dictionary.getRange("C:C").format.columnWidth = 19;
dictionary.getRange("D:D").format.columnWidth = 75;
dictionary.freezePanes.freezeRows(1);

catalog.showGridLines = false;
catalog.getRange("A1:F1").values = [[
  "Failure Type",
  "Subsystem",
  "Severity",
  "Observable Pattern",
  "Probable Root Cause",
  "Recommended Action",
]];
styleHeader(catalog.getRange("A1:F1"));
catalog.getRange(`A2:F${failureCatalog.length + 1}`).values = failureCatalog.map((item) => [
  item.failureType,
  item.subsystem,
  item.severity,
  item.precursor,
  item.rootCause,
  item.action,
]);
styleBody(catalog.getRange(`A2:F${failureCatalog.length + 1}`));
catalog.getRange(`D2:F${failureCatalog.length + 1}`).format.wrapText = true;
catalog.getRange(`A2:F${failureCatalog.length + 1}`).format.rowHeight = 55;
catalog.getRange("A:A").format.columnWidth = 31;
catalog.getRange("B:B").format.columnWidth = 16;
catalog.getRange("C:C").format.columnWidth = 14;
catalog.getRange("D:F").format.columnWidth = 52;
catalog.freezePanes.freezeRows(1);

sources.showGridLines = false;
sources.getRange("A1:D1").values = [["Source", "Relevant Section", "Use", "Location"]];
styleHeader(sources.getRange("A1:D1"));
sources.getRange("A2:D7").values = [
  [
    "Thesis V1.00 2.pdf",
    "Tables 3.2, 4.1-4.3, 6.1-6.5 and Annexes 01/04/14",
    "Expressway incident sequences, monitored variables, alarm correlation and response behaviour.",
    "EE5206 Software Project folder",
  ],
  [
    "Software Project Proposal.pdf",
    "Scope, methodology and features",
    "Required subsystems, diagnosis outputs and corrective-action requirements.",
    "EE5206 Software Project folder",
  ],
  [
    "Software Project Overall Doc.pdf",
    "Sections 3-5",
    "Project sensor names, threshold examples and predictive-maintenance contract.",
    "EE5206 Software Project/Architecture",
  ],
  [
    "CEB Specification 020:2015",
    "System parameters",
    "400/230 V, 50 Hz Sri Lankan distribution baseline.",
    "https://www.ceb.lk/front_img/specifications/1592905716020_2015_MINIATURE_CIRCUIT_BREAKER.pdf",
  ],
  [
    "Schneider Electric SRT5KRMXLI data sheet",
    "Input, battery and environmental specifications",
    "UPS operating-voltage, battery and temperature plausibility checks.",
    "https://iportal.se.com/Contents/docs/UPS-SRT5KRMXLI_DATA%20SHEET.PDF",
  ],
  [
    "ASCO Series 230 C1000 user manual",
    "Controller functions and diagnostics",
    "ATS voltage/frequency acquisition, transfer modes and abnormal-transfer behaviour.",
    "https://www.se.com/uk/en/download/document/ASC-TS-UM-230C1000/",
  ],
];
styleBody(sources.getRange("A2:D7"));
sources.getRange("A2:D7").format.wrapText = true;
sources.getRange("A2:D7").format.rowHeight = 50;
sources.getRange("A:A").format.columnWidth = 37;
sources.getRange("B:B").format.columnWidth = 42;
sources.getRange("C:C").format.columnWidth = 65;
sources.getRange("D:D").format.columnWidth = 80;
sources.freezePanes.freezeRows(1);

const workbookSample = [...eventBoundarySamples, ...sampleRows].slice(0, 2_000);
sample.showGridLines = false;
const sampleLastColumn = excelColumn(columns.length - 1);
sample.getRange(`A1:${sampleLastColumn}1`).values = [columns];
styleHeader(sample.getRange(`A1:${sampleLastColumn}1`));
if (workbookSample.length > 0) {
  sample.getRange(`A2:${sampleLastColumn}${workbookSample.length + 1}`).values = workbookSample;
  styleBody(sample.getRange(`A2:${sampleLastColumn}${workbookSample.length + 1}`));
}
sample.freezePanes.freezeRows(1);
sample.freezePanes.freezeColumns(6);
sample.getRange("A:A").format.columnWidth = 13;
sample.getRange("B:B").format.columnWidth = 30;
sample.getRange(`B2:B${workbookSample.length + 1}`).format.numberFormat = "yyyy-mm-dd hh:mm";
sample.getRange("C:F").format.columnWidth = 18;
sample.getRange("G:J").format.columnWidth = 20;
sample.getRange(`K:${sampleLastColumn}`).format.columnWidth = 17;
const transferColumn = excelColumn(columns.indexOf("last_transfer_at"));
sample.getRange(`${transferColumn}2:${transferColumn}${workbookSample.length + 1}`)
  .format.numberFormat = "yyyy-mm-dd hh:mm";
const failureTypeColumn = excelColumn(columns.indexOf("target_failure_type"));
sample.getRange(`${failureTypeColumn}:${sampleLastColumn}`).format.columnWidth = 30;
sample.getRange(`${failureTypeColumn}2:${sampleLastColumn}${workbookSample.length + 1}`)
  .format.wrapText = true;

overview.getRange("A4:A10").format.font = { bold: true, color: dark, name: bodyFont };
qa.getRange(`A2:A${qaRows.length + 1}`).format.fill = paleBlue;
catalog.getRange(`C2:C${failureCatalog.length + 1}`).conditionalFormats.addCustom(
  '=C2="CRITICAL"',
  { fill: paleRed, font: { bold: true, color: "#9D1C1C" } },
);
catalog.getRange(`C2:C${failureCatalog.length + 1}`).conditionalFormats.addCustom(
  '=C2="WARNING"',
  { fill: paleAmber, font: { bold: true, color: "#805B00" } },
);
const riskColumn = excelColumn(columns.indexOf("target_risk_level"));
sample.getRange(`${riskColumn}2:${riskColumn}${workbookSample.length + 1}`).conditionalFormats.addCustom(
  `=${riskColumn}2="CRITICAL"`,
  { fill: paleRed, font: { bold: true, color: "#9D1C1C" } },
);
sample.getRange(`${riskColumn}2:${riskColumn}${workbookSample.length + 1}`).conditionalFormats.addCustom(
  `=${riskColumn}2="WARNING"`,
  { fill: paleAmber, font: { bold: true, color: "#805B00" } },
);
sample.getRange(`${riskColumn}2:${riskColumn}${workbookSample.length + 1}`).conditionalFormats.addCustom(
  `=${riskColumn}2="NORMAL"`,
  { fill: paleGreen, font: { color: "#215C3A" } },
);

const inspections = [];
inspections.push(
  await workbook.inspect({
    kind: "table",
    range: "Overview!A1:F13",
    include: "values,formulas",
    tableMaxRows: 15,
    tableMaxCols: 8,
    maxChars: 8_000,
  }),
);
inspections.push(
  await workbook.inspect({
    kind: "table",
    range: "QA Summary!A1:L16",
    include: "values,formulas",
    tableMaxRows: 18,
    tableMaxCols: 12,
    maxChars: 8_000,
  }),
);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

for (const [sheetName, range] of [
  ["Overview", "A1:F13"],
  ["QA Summary", "A1:L16"],
  ["Data Dictionary", "A1:D25"],
  ["Failure Catalog", "A1:F14"],
  ["Sources", "A1:D7"],
  ["Dataset Sample", "A1:L25"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
  const safeName = sheetName.toLowerCase().replaceAll(" ", "-");
  await fs.writeFile(
    path.join(previewDir, `${safeName}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);

const qaPayload = {
  csvPath,
  byTypePaths,
  workbookPath,
  totalRecords,
  expectedRecords:
    DAYS * (24 * 60 / INTERVAL_MINUTES) * equipment.length,
  dateRange: [iso(START), iso(END - INTERVAL_MS)],
  intervalMinutes: INTERVAL_MINUTES,
  equipmentCount: equipment.length,
  uniqueFailureEvents: new Set(events.map((event) => event.id)).size,
  statsByType,
  splitCounts,
  formulaErrors: errors.ndjson,
  overviewInspection: inspections[0].ndjson,
  qaInspection: inspections[1].ndjson,
};
await fs.writeFile(
  path.join(outputDir, "dataset_validation.json"),
  `${JSON.stringify(qaPayload, null, 2)}\n`,
);
console.log(JSON.stringify(qaPayload, null, 2));
