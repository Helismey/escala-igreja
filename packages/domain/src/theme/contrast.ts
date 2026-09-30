/**
 * Validador e utilitário de contraste de cor conforme WCAG 2.1 (nível AA).
 * Garante que a cor primária da igreja tenha contraste adequado sobre o fundo da interface.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) {
    throw new Error('Formato hexadecimal inválido. Use #RRGGBB');
  }

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error('Hexadecimal contém caracteres inválidos');
  }

  return { r, g, b };
}

export function rgbToHex(color: RgbColor): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
}

/**
 * Calcula a luminância relativa conforme definição W3C WCAG 2.1.
 */
export function getRelativeLuminance(color: RgbColor): number {
  const [sR, sG, sB] = [color.r / 255, color.g / 255, color.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sR! + 0.7152 * sG! + 0.0722 * sB!;
}

/**
 * Calcula a razão de contraste entre duas cores hexadecimais (ex: 4.5:1 -> retorna 4.5).
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);

  const lumA = getRelativeLuminance(rgbA);
  const lumB = getRelativeLuminance(rgbB);

  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);

  return (brightest + 0.05) / (darkest + 0.05);
}

export interface ThemeContrastReport {
  primaryHex: string;
  contrastWithWhite: number;       // Para botões com texto branco (mínimo 4.5:1)
  contrastWithLightBg: number;     // Para texto em fundo Névoa (#F4F6F7)
  passesWhiteText: boolean;
  passesLightBg: boolean;
  suggestedHex?: string;
}

/**
 * Avalia a cor primária da igreja e sugere ajuste se não passar nas diretrizes WCAG AA.
 */
export function validateChurchThemeColor(primaryHex: string): ThemeContrastReport {
  const WHITE = '#FFFFFF';
  const LIGHT_BG = '#F4F6F7';

  const contrastWithWhite = Number(getContrastRatio(primaryHex, WHITE).toFixed(2));
  const contrastWithLightBg = Number(getContrastRatio(primaryHex, LIGHT_BG).toFixed(2));

  const passesWhiteText = contrastWithWhite >= 4.5;
  const passesLightBg = contrastWithLightBg >= 4.5;

  let suggestedHex: string | undefined;

  // Se não passar com texto branco (por ser muito clara), sugere versão escurecida
  if (!passesWhiteText) {
    const rgb = hexToRgb(primaryHex);
    let factor = 0.85;
    let adjustedHex = primaryHex;

    for (let i = 0; i < 15; i++) {
      const adjustedRgb = {
        r: Math.round(rgb.r * factor),
        g: Math.round(rgb.g * factor),
        b: Math.round(rgb.b * factor),
      };
      adjustedHex = rgbToHex(adjustedRgb);
      if (getContrastRatio(adjustedHex, WHITE) >= 4.5) {
        suggestedHex = adjustedHex;
        break;
      }
      factor -= 0.05;
    }
  }

  return {
    primaryHex,
    contrastWithWhite,
    contrastWithLightBg,
    passesWhiteText,
    passesLightBg,
    suggestedHex,
  };
}
