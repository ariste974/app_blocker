import { getDeviceActivityModule } from '../lib/deviceActivityModule.ios';
import type { ScreenTimePickerProps } from './ScreenTimePicker';
import { ScreenTimePickerSimulation } from './ScreenTimePickerSimulation';

export function ScreenTimePicker({
  visible,
  selectionToken,
  onSelectionChange,
  onDismiss,
}: ScreenTimePickerProps) {
  if (!visible) return null;

  const deviceActivity = getDeviceActivityModule();
  if (!deviceActivity?.isAvailable()) {
    return <ScreenTimePickerSimulation
      visible={visible}
      selectionToken={selectionToken}
      onSelectionChange={onSelectionChange}
      onDismiss={onDismiss}
    />;
  }

  const DeviceActivitySelectionSheetView =
    deviceActivity.DeviceActivitySelectionSheetView;

  return (
    <DeviceActivitySelectionSheetView
      style={{ position: 'absolute', width: 1, height: 1 }}
      familyActivitySelection={selectionToken}
      onSelectionChange={(event) => {
        const { familyActivitySelection, ...metadata } = event.nativeEvent;
        if (familyActivitySelection) {
          onSelectionChange(familyActivitySelection, metadata);
        }
      }}
      onDismissRequest={onDismiss}
    />
  );
}
