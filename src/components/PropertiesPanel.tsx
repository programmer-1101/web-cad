// src/components/PropertiesPanel.tsx
import React from 'react';
import { CircuitComponent } from '../types/types';
import '../styles.css';

interface ComponentPropertiesProps {
  component: CircuitComponent;
  onUpdate: (id: string, value: number) => void;
}

const ComponentProperties: React.FC<ComponentPropertiesProps> = ({
  component,
  onUpdate
}) => {
  const getUnit = () => {
    switch(component.type) {
      case 'resistor': return 'Ω';
      case 'voltage': return 'V';
      case 'capacitor': return 'F';
      case 'inductor': return 'H';
      case 'diode': return 'V';
      default: return '';
    }
  };

  const getStep = () => {
    switch(component.type) {
      case 'diode': return 0.1;
      case 'capacitor': return 0.000001;
      case 'inductor': return 0.001;
      default: return 1;
    }
  };

  return (
    <div className="properties-panel">
      <h3>Component Properties</h3>
      <div className="property-row">
        <label>Type:</label>
        <div className="property-value">{component.type === 'subcircuit' ? `Subcircuit: ${component.subcircuitId}` : component.type}</div>
      </div>
      {/* Only show value input for non-subcircuit types */}
      {component.type !== 'subcircuit' && (
        <div className="property-row">
          <label>Value:</label>
          <input
            type="number"
            value={component.value}
            onChange={(e) => onUpdate(component.id, parseFloat(e.target.value) || 0)}
            step={getStep()}
          />
          <span className="unit">{getUnit()}</span>
        </div>
      )}
      {/* You could add more properties here for subcircuits if needed,
          e.g., a list of its exposed terminals. */}
    </div>
  );
};

export default ComponentProperties;