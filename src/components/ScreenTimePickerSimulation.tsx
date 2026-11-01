import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SIMULATED_APPS, getSelectedSimulatedApps } from '../features/screen-time/simulatedApps';
import type { ScreenTimePickerProps } from './ScreenTimePicker';

export function ScreenTimePickerSimulation({
  visible,
  selectionToken,
  onSelectionChange,
  onDismiss,
}: ScreenTimePickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getSelectedSimulatedApps(selectionToken),
  );

  const toggleApp = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  const saveSelection = () => {
    const selection = JSON.stringify(selectedIds);
    onSelectionChange(selection, {
      applicationCount: selectedIds.length,
      categoryCount: 0,
      webDomainCount: 0,
    });
    onDismiss();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>SÉLECTION DE TEST</Text>
          <Text style={styles.title}>Que veux-tu mettre en pause ?</Text>
          <Text style={styles.description}>
            Choisis des catégories fictives. Expo Go ne bloque aucune application réelle.
          </Text>

          <View style={styles.options}>
            {SIMULATED_APPS.map((app) => {
              const selected = selectedIds.includes(app.id);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={app.id}
                  onPress={() => toggleApp(app.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionName, selected && styles.optionNameSelected]}>
                    {app.name}
                  </Text>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={saveSelection}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Enregistrer la sélection</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 35, 29, 0.48)',
  },
  sheet: {
    backgroundColor: '#F7F8F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D5DBD1',
    alignSelf: 'center',
    marginBottom: 24,
  },
  eyebrow: { color: '#6C8A66', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  title: { color: '#19372F', fontSize: 23, lineHeight: 29, fontWeight: '800' },
  description: { color: '#78817A', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  options: { gap: 8 },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EBE4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  optionSelected: { backgroundColor: '#F1F6E5', borderColor: '#A8C96A' },
  optionName: { flex: 1, color: '#5D6961', fontSize: 14, fontWeight: '600' },
  optionNameSelected: { color: '#20372F', fontWeight: '700' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#C9D0C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#739347', borderColor: '#739347' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#DDF18C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: 13 },
  cancelButtonText: { color: '#65716A', fontSize: 13, fontWeight: '700' },
});
