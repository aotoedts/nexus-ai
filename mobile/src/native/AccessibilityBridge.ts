import { NativeModules } from 'react-native';

interface AccessibilityModuleType {
  isServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  dumpScreen(): Promise<string>;
  tap(x: number, y: number): Promise<boolean>;
  goHome(): Promise<boolean>;
  goBack(): Promise<boolean>;
}

const { AccessibilityModule } = NativeModules as {
  AccessibilityModule: AccessibilityModuleType;
};

export interface ScreenNode {
  text: string;
  desc: string;
  className: string;
  clickable: boolean;
  x: number;
  y: number;
}

export const AccessibilityBridge = {
  isServiceEnabled: (): Promise<boolean> => AccessibilityModule.isServiceEnabled(),

  openSettings: (): void => AccessibilityModule.openAccessibilitySettings(),

  dumpScreen: async (): Promise<ScreenNode[]> => {
    const raw = await AccessibilityModule.dumpScreen();
    return JSON.parse(raw) as ScreenNode[];
  },

  tap: (x: number, y: number): Promise<boolean> => AccessibilityModule.tap(x, y),

  goHome: (): Promise<boolean> => AccessibilityModule.goHome(),

  goBack: (): Promise<boolean> => AccessibilityModule.goBack(),
};
