import React from 'react';
import { CircuitComponent } from '../models/types';

interface ComponentPropertiesProps {
  component: CircuitComponent | null;
  onUpdate: (id: string, value: number) => void;
}

const ComponentProperties: React.FC<ComponentPropertiesProps> = ({ component, onUpdate }) => {
  if (!component) return null;

  return (
    <div className="properties-panel">
      <h3>Component Properties</h3>
      <div className="property-row">
        <label>Value:</label>
        <input
          type="number"
          value={component.value}
          onChange={(e) => onUpdate(component.id, parseFloat(e.target.value) || 0)}
          step={component.type === 'diode' ? 0.1 : 1}
        />
        <span>
          {component.type === 'resistor' ? 'Ω' : 
           component.type === 'voltage' ? 'V' : 
           component.type === 'capacitor' ? 'F' : 
           component.type === 'inductor' ? 'H' : 'V'}
        </span>
      </div>
    </div>
  );
};

export default ComponentProperties;