// src/components/Toolbar.tsx
import React from 'react';
import { ComponentType, ToolMode, SubCircuit } from '../types/types'; // Import SubCircuit

interface ToolbarProps {
  selectedTool: ToolMode;
  setSelectedTool: (mode: ToolMode) => void;
  selectedComponentType: ComponentType;
  setSelectedComponentType: (type: ComponentType) => void;
  // New prop for managing custom subcircuits
  subcircuits: SubCircuit[];
  onStartDragComponent: (type: ComponentType, subcircuitId?: string) => void; // New prop for drag start
  onCreateSubcircuit: () => void; // New prop for creating subcircuits
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  setSelectedTool,
  selectedComponentType,
  setSelectedComponentType,
  subcircuits, // Added prop
  onStartDragComponent, // Added prop
  onCreateSubcircuit, // Added prop
}) => {
  const basicComponents: ComponentType[] = [
    'resistor', 'capacitor', 'inductor',
    'voltage', 'diode', 'transistor', 'bulb'
  ];

  const handleDragStart = (e: React.DragEvent, type: ComponentType, subcircuitId?: string) => {
    // Set the data that will be transferred during the drag
    e.dataTransfer.setData('text/plain', type + (subcircuitId ? `:${subcircuitId}` : ''));
    e.dataTransfer.effectAllowed = 'copy';
    onStartDragComponent(type, subcircuitId); // Notify parent App.tsx
  };

  return (
    <div className="toolbar">
      <div className="tool-section">
        <h3>Tools</h3>
        <button
          className={selectedTool === 'select' ? 'active' : ''}
          onClick={() => setSelectedTool('select')}
        >
          Select
        </button>
        <button
          className={selectedTool === 'wire' ? 'active' : ''}
          onClick={() => setSelectedTool('wire')}
        >
          Wire
        </button>
        <button
          className={selectedTool === 'subcircuit_create' ? 'active' : ''}
          onClick={onCreateSubcircuit} // Calls the new handler
        >
          Create Subcircuit
        </button>
      </div>

      <div className="tool-section">
        <h3>Basic Components</h3>
        {basicComponents.map(type => (
          <button
            key={type}
            className={selectedComponentType === type ? 'active' : ''}
            onClick={() => {
              setSelectedTool('add');
              setSelectedComponentType(type);
            }}
            draggable="true" // Make buttons draggable
            onDragStart={(e) => handleDragStart(e, type)} // Handle drag start
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* New section for Subcircuits */}
      {subcircuits.length > 0 && (
        <div className="tool-section">
          <h3>My Subcircuits</h3>
          {subcircuits.map(subcircuit => (
            <button
              key={subcircuit.id}
              className={selectedComponentType === 'subcircuit' && selectedComponentType === subcircuit.id ? 'active' : ''}
              onClick={() => {
                setSelectedTool('add');
                setSelectedComponentType('subcircuit'); // Indicate it's a subcircuit
                // You might want a better way to pass the specific subcircuit ID to Canvas
                // For now, let's just make it implicitly picked up by Canvas's drag handler
              }}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, 'subcircuit', subcircuit.id)} // Pass subcircuitId
            >
              {subcircuit.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Toolbar;