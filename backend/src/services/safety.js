const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

export function evaluateSafety({ temperatureC, currentA, deviceOnline = true }) {
  const tempWarn = numberEnv('TEMP_WARNING_C', 40);
  const tempCrit = numberEnv('TEMP_CRITICAL_C', 50);
  const currentWarn = numberEnv('CURRENT_WARNING_A', 2);
  const currentCrit = numberEnv('CURRENT_CRITICAL_A', 3);
  const reasons = [];

  if (!deviceOnline) reasons.push('Device reported offline');
  if (temperatureC >= tempWarn) reasons.push(`Temperature at/above warning threshold (${tempWarn}°C)`);
  if (currentA >= currentWarn) reasons.push(`Current at/above warning threshold (${currentWarn}A)`);

  let status = 'NORMAL';
  if (temperatureC >= tempCrit || currentA >= currentCrit || !deviceOnline) status = 'CRITICAL';
  else if (temperatureC >= tempWarn || currentA >= currentWarn) status = 'WARNING';

  // Simple illustrative score for UI only; not a validated probability of fire.
  const tempScore = Math.max(0, Math.min(60, (temperatureC / Math.max(tempCrit, 1)) * 60));
  const currentScore = Math.max(0, Math.min(40, (currentA / Math.max(currentCrit, 0.1)) * 40));
  const riskScore = Math.round(Math.max(status === 'CRITICAL' ? 75 : 0, tempScore + currentScore));

  return { status, reasons, riskScore };
}
