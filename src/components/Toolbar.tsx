import React from 'react';
import { ComponentType, ToolMode } from '../models/types';
import './Toolbar.css';

interface ToolbarProps {
  selectedComponent: ComponentType;
  onSelectComponent: (type: ComponentType) => void;
  onDelete: () => void;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  hasSelection: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedComponent, 
  onSelectComponent,
  onDelete,
  toolMode,
  onToolModeChange,
  hasSelection
}) => {
  const componentButtons = [
    { label: 'Resistor', type: 'resistor' as ComponentType, icon: 'R' },
    { label: 'Voltage Source', type: 'voltage' as ComponentType, icon: 'V' },
    { label: 'Capacitor', type: 'capacitor' as ComponentType, icon: 'C' },
    { label: 'Inductor', type: 'inductor' as ComponentType, icon: 'L' },
    { label: 'Diode', type: 'diode' as ComponentType, icon: 'D' },
    { label: 'AND Gate', type: 'logic-gate' as ComponentType, icon: 'AND' },
    { label: 'OR Gate', type: 'logic-gate' as ComponentType, icon: 'OR' },
    { label: 'NOT Gate', type: 'logic-gate' as ComponentType, icon: 'NOT' },
    { label: 'NPN Transistor', type: 'transistor' as ComponentType, icon: 'NPN' },
    { label: 'PNP Transistor', type: 'transistor' as ComponentType, icon: 'PNP' },
    { label: 'Light Bulb', type: 'bulb' as ComponentType, icon: '💡' },
  ];

  return (
    <div className="toolbar">
      {/* Mode Selection */}
      <div className="toolbar-section">
        <h3>Tools</h3>
        <button
          className={`tool-button ${toolMode === 'select' ? 'active' : ''}`}
          onClick={() => onToolModeChange('select')}
        >
          <span className="tool-icon">🖱️</span>
          <span className="tool-label">Select/Move</span>
        </button>
        <button
          className={`tool-button ${toolMode === 'add' ? 'active' : ''}`}
          onClick={() => onToolModeChange('add')}
        >
          <span className="tool-icon">➕</span>
          <span className="tool-label">Add Components</span>
        </button>
      </div>

      {/* Components List */}
      <div className="toolbar-section">
        <h3>Components</h3>
        <div className="component-buttons">
          {componentButtons.map(({ label, type, icon }) => (
            <button
              key={`${type}-${label}`}
              className={`component-button ${
                toolMode === 'add' && selectedComponent === type ? 'active' : ''
              }`}
              onClick={() => {
                onToolModeChange('add');
                onSelectComponent(type);
              }}
            >
              <span className="component-icon">{icon}</span>
              <span className="component-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="toolbar-section actions-section">
        <button
          className="delete-button"
          onClick={onDelete}
          disabled={!hasSelection}
        >
          <span className="action-icon">🗑️</span>
          <span className="action-label">Delete Selected</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;