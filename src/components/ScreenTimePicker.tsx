import type { SelectionMetadata } from '../lib/screenTime';
import { ScreenTimePickerSimulation } from './ScreenTimePickerSimulation';

export type ScreenTimePickerProps = {
  visible: boolean;
  selectionToken: string | null;
  onSelectionChange: (
    selectionToken: string,
    metadata: SelectionMetadata,
  ) => void | Promise<void>;
  onDismiss: () => void;
};

export function ScreenTimePicker(props: ScreenTimePickerProps) {
  return props.visible ? <ScreenTimePickerSimulation {...props} /> : null;
}
