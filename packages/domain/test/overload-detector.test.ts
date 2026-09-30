import { describe, it, expect } from 'vitest';
import {
  detectVolunteerOverload,
  calculateConsecutiveWeekends,
} from '../src/scheduling/overload-detector.js';

describe('Detector de Sobrecarga de Voluntários', () => {
  it('deve identificar sobrecarga por 3 fins de semana consecutivos', () => {
    // Finais de semana de Outubro/2026:
    // Sábado 03/10/2026, Domingo 04/10/2026
    // Sábado 10/10/2026, Domingo 11/10/2026
    // Sábado 17/10/2026, Domingo 18/10/2026
    const assignments = [
      { id: '1', startsAt: new Date('2026-10-04T10:00:00Z'), endsAt: new Date('2026-10-04T12:00:00Z') },
      { id: '2', startsAt: new Date('2026-10-11T10:00:00Z'), endsAt: new Date('2026-10-11T12:00:00Z') },
      { id: '3', startsAt: new Date('2026-10-18T10:00:00Z'), endsAt: new Date('2026-10-18T12:00:00Z') },
    ];

    const consecutive = calculateConsecutiveWeekends(assignments, new Date('2026-10-18T12:00:00Z'));
    expect(consecutive).toBe(3);

    const result = detectVolunteerOverload(assignments, new Date('2026-10-18T12:00:00Z'));
    expect(result.isOverloaded).toBe(true);
    expect(result.reasons.some((r) => r.includes('fins de semana consecutivos'))).toBe(true);
  });

  it('não deve apontar sobrecarga quando houver descanso intercalado', () => {
    // Serviu no FDS 1 e no FDS 3, mas descansou no FDS 2
    const assignments = [
      { id: '1', startsAt: new Date('2026-10-04T10:00:00Z'), endsAt: new Date('2026-10-04T12:00:00Z') },
      { id: '2', startsAt: new Date('2026-10-18T10:00:00Z'), endsAt: new Date('2026-10-18T12:00:00Z') },
    ];

    const consecutive = calculateConsecutiveWeekends(assignments, new Date('2026-10-18T12:00:00Z'));
    expect(consecutive).toBe(1);

    const result = detectVolunteerOverload(assignments, new Date('2026-10-18T12:00:00Z'));
    expect(result.isOverloaded).toBe(false);
  });

  it('deve alertar alta densidade quando houver mais de 4 escalas em 30 dias', () => {
    const assignments = [
      { id: '1', startsAt: new Date('2026-10-01T10:00:00Z'), endsAt: new Date('2026-10-01T12:00:00Z') },
      { id: '2', startsAt: new Date('2026-10-05T10:00:00Z'), endsAt: new Date('2026-10-05T12:00:00Z') },
      { id: '3', startsAt: new Date('2026-10-10T10:00:00Z'), endsAt: new Date('2026-10-10T12:00:00Z') },
      { id: '4', startsAt: new Date('2026-10-15T10:00:00Z'), endsAt: new Date('2026-10-15T12:00:00Z') },
      { id: '5', startsAt: new Date('2026-10-20T10:00:00Z'), endsAt: new Date('2026-10-20T12:00:00Z') },
    ];

    const result = detectVolunteerOverload(assignments, new Date('2026-10-20T12:00:00Z'));
    expect(result.isOverloaded).toBe(true);
    expect(result.assignmentsIn30Days).toBe(5);
    expect(result.reasons.some((r) => r.includes('escalas nos últimos 30 dias'))).toBe(true);
  });
});
