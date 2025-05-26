// src/App.tsx
import React, { useState, useCallback } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import { CircuitComponent, Wire, ToolMode, ComponentType, SubCircuit, Terminal } from './types/types'; // Import new types
import './styles.css';

import { COMPONENT_SIZE } from './constants';

const App = () => {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolMode>('select');
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType>('resistor');
  const [selectedItem, setSelectedItem] = useState<CircuitComponent | null>(null);

  // New state for custom subcircuits
  const [subcircuits, setSubcircuits] = useState<SubCircuit[]>([]);
  // New state to track the component being dragged from the toolbar
  const [draggedComponentType, setDraggedComponentType] = useState<ComponentType | null>(null);
  const [draggedSubcircuitId, setDraggedSubcircuitId] = useState<string | null>(null);

  const handleCreateSubcircuit = useCallback(() => {
    // This is where you'd initiate the subcircuit creation process.
    // For a real app, this would likely involve:
    // 1. Entering a "subcircuit creation mode".
    // 2. Allowing user to select existing components/wires on the canvas.
    // 3. Opening a modal/panel for naming the subcircuit and defining its input/output terminals.
    // 4. Removing selected components/wires from the main canvas.
    // 5. Adding the new subcircuit definition to the `subcircuits` state.

    // --- TEMPORARY MOCK FOR DEMONSTRATION ---
    // Let's create a very simple "AND gate" subcircuit from a couple of resistors
    // This is just a placeholder to show the flow.
    // In a real scenario, the user selects components and defines terminals interactively.

    if (components.length < 2) {
      alert("Please place at least two components on the canvas to create a subcircuit (for this simplified example).");
      return;
    }

    const newSubcircuitId = `custom_and_gate_${Date.now()}`;
    const newSubcircuitName = prompt("Enter a name for your subcircuit (e.g., 'My AND Gate'):");

    if (!newSubcircuitName) return;

    // For this mock, let's take the first two components and remove them
    // and assume they are input/output for simplification
    const compsToAbsorb = components.slice(0, 2);
    const wiresToAbsorb = wires.filter(wire =>
      compsToAbsorb.some(c => c.id === wire.from.componentId || c.id === wire.to.componentId)
    );

    // Filter out the absorbed components and wires from the main canvas
    setComponents(prev => prev.filter(c => !compsToAbsorb.includes(c)));
    setWires(prev => prev.filter(w => !wiresToAbsorb.includes(w)));


    const newSubcircuit: SubCircuit = {
      id: newSubcircuitId,
      name: newSubcircuitName,
      internalComponents: compsToAbsorb.map(c => ({
          ...c,
          x: c.x - compsToAbsorb[0].x, // Make internal coords relative
          y: c.y - compsToAbsorb[0].y
      })),
      internalWires: wiresToAbsorb,
      inputs: [
        { id: 'in1', name: 'Input 1', x: 0, y: COMPONENT_SIZE / 2 },
        { id: 'in2', name: 'Input 2', x: 0, y: COMPONENT_SIZE / 2 + 20 }
      ],
      outputs: [
        { id: 'out1', name: 'Output 1', x: 80, y: COMPONENT_SIZE / 2 + 10 }
      ],
      width: 100, // Example size for the subcircuit display
      height: 60,
    };

    setSubcircuits(prev => [...prev, newSubcircuit]);
    alert(`Subcircuit "${newSubcircuitName}" created and added to toolbar!`);
    setSelectedTool('select'); // Return to select mode
  }, [components, wires]);


  // Callback for when a component drag starts from the Toolbar
  const handleStartDragComponent = useCallback((type: ComponentType, subcircuitId?: string) => {
    setDraggedComponentType(type);
    setDraggedSubcircuitId(subcircuitId || null);
  }, []);

  // Callback for when a component is dropped onto the Canvas
  const handleDropComponent = useCallback((e: React.DragEvent) => {
    if (!draggedComponentType) return; // No component was being dragged

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - COMPONENT_SIZE / 2;
    const y = e.clientY - rect.top - COMPONENT_SIZE / 2;

    const newComponent: CircuitComponent = {
      id: Date.now().toString(),
      type: draggedComponentType,
      x: Math.round(x / 20) * 20, // Snap to grid
      y: Math.round(y / 20) * 20, // Snap to grid
      value: getDefaultValue(draggedComponentType),
    };

    if (draggedComponentType === 'subcircuit' && draggedSubcircuitId) {
      newComponent.subcircuitId = draggedSubcircuitId;
      // You'll need to set up the terminalMap here based on the subcircuit definition
      // For now, let's keep it simple.
      const subcircuitDef = subcircuits.find(s => s.id === draggedSubcircuitId);
      if (subcircuitDef) {
        newComponent.value = 0; // Subcircuits don't have a direct 'value'
        // Create an initial terminal map. This needs to be dynamic based on the subcircuit's terminals
        newComponent.terminalMap = {};
        subcircuitDef.inputs.forEach(input => {
          newComponent.terminalMap![input.id] = { componentId: '', terminal: 0 }; // Placeholder
        });
        subcircuitDef.outputs.forEach(output => {
          newComponent.terminalMap![output.id] = { componentId: '', terminal: 0 }; // Placeholder
        });
      }
    }

    setComponents((prev) => [...prev, newComponent]);
    setDraggedComponentType(null); // Reset dragged component
    setDraggedSubcircuitId(null);
    setSelectedTool('select'); // Switch to select mode after dropping
  }, [draggedComponentType, draggedSubcircuitId, subcircuits, components]); // Added dependencies

  // Helper to get default value (moved from Canvas.tsx, now App.tsx manages it for new component creation)
  const getDefaultValue = (type: ComponentType): number => {
    const defaults = {
      resistor: 100,
      capacitor: 0.000001,
      inductor: 0.001,
      voltage: 5,
      diode: 0.7,
      transistor: 0,
      bulb: 0,
      subcircuit: 0, // Subcircuits don't have a 'value' in this context
    };
    return defaults[type];
  };


  return (
    <div className="app">
      <Toolbar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        selectedComponentType={selectedComponentType}
        setSelectedComponentType={setSelectedComponentType}
        subcircuits={subcircuits} // Pass subcircuits to Toolbar
        onStartDragComponent={handleStartDragComponent} // Pass drag start handler
        onCreateSubcircuit={handleCreateSubcircuit} // Pass subcircuit creation handler
      />

      <div className="main-content">
        <Canvas
          components={components}
          setComponents={setComponents}
          wires={wires}
          setWires={setWires}
          selectedTool={selectedTool}
          selectedComponentType={selectedComponentType}
          onDropComponent={handleDropComponent} // Pass drop handler to Canvas
          draggedComponentType={draggedComponentType} // Pass for visual feedback
          subcircuits={subcircuits} // Pass subcircuits for rendering/terminal logic
        />

        {selectedItem && (
          <PropertiesPanel
            component={selectedItem}
            onUpdate={(id, value) => {
              setComponents(components.map(c =>
                c.id === id ? { ...c, value } : c
              ));
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;