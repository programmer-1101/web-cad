import React, { useState } from 'react';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import ComponentProperties from './components/ComponentProperties';
import { ComponentType, CircuitComponent, Wire, ToolMode } from './models/types';
import './App.css';

function App() {
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('resistor');
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>('add');
  const [selectedItem, setSelectedItem] = useState<{type: 'component' | 'wire', id: string} | null>(null);
  const [circuits, setCircuits] = useState<{name: string, components: CircuitComponent[], wires: Wire[]}[]>([]);
  const [currentCircuit, setCurrentCircuit] = useState<string>('Untitled');

  // Save current circuit
  const saveCircuit = () => {
    const existingIndex = circuits.findIndex(c => c.name === currentCircuit);
    const newCircuit = {
      name: currentCircuit,
      components,
      wires
    };

    if (existingIndex >= 0) {
      const updatedCircuits = [...circuits];
      updatedCircuits[existingIndex] = newCircuit;
      setCircuits(updatedCircuits);
    } else {
      setCircuits([...circuits, newCircuit]);
    }
    alert(`Circuit "${currentCircuit}" saved!`);
  };

  // Create new circuit
  const newCircuit = () => {
    if (components.length > 0 || wires.length > 0) {
      if (!window.confirm('Save current circuit before creating new?')) {
        setComponents([]);
        setWires([]);
        setCurrentCircuit(`Circuit ${circuits.length + 1}`);
        return;
      }
      saveCircuit();
    }
    setComponents([]);
    setWires([]);
    setCurrentCircuit(`Circuit ${circuits.length + 1}`);
  };

  // Load circuit
  const loadCircuit = (name: string) => {
    const circuit = circuits.find(c => c.name === name);
    if (circuit) {
      setComponents(circuit.components);
      setWires(circuit.wires);
      setCurrentCircuit(name);
    }
  };

  // Update component values
  const handleUpdateComponent = (id: string, value: number) => {
    setComponents(components.map(comp =>
      comp.id === id ? { ...comp, value } : comp
    ));
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'component') {
      setComponents(components.filter(c => c.id !== selectedItem.id));
      setWires(wires.filter(w => 
        w.fromComponentId !== selectedItem.id && 
        w.toComponentId !== selectedItem.id
      ));
    } else {
      setWires(wires.filter(w => w.id !== selectedItem.id));
    }
    
    setSelectedItem(null);
  };

  const selectedComponentData = selectedItem?.type === 'component' 
    ? components.find(c => c.id === selectedItem.id)
    : null;

  return (
    <div className="App">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="circuit-controls">
          <button onClick={newCircuit} className="nav-button">
            <i className="icon-add"></i> New
          </button>
          <div className="circuit-name">
            <input
              value={currentCircuit}
              onChange={(e) => setCurrentCircuit(e.target.value)}
              placeholder="Circuit name"
            />
          </div>
          <button onClick={saveCircuit} className="nav-button">
            <i className="icon-save"></i> Save
          </button>
          <div className="circuit-dropdown">
            <select 
              value="" 
              onChange={(e) => loadCircuit(e.target.value)}
              className="load-dropdown"
            >
              <option value="">Load Circuit...</option>
              {circuits.map(circuit => (
                <option key={circuit.name} value={circuit.name}>
                  {circuit.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="main-content">
        <Toolbar
          selectedComponent={selectedComponent}
          onSelectComponent={setSelectedComponent}
          onDelete={handleDeleteSelected}
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          hasSelection={!!selectedItem}
        />

        <Canvas
          selectedComponent={selectedComponent}
          components={components}
          setComponents={setComponents}
          wires={wires}
          setWires={setWires}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          toolMode={toolMode}
        />

        {selectedComponentData && (
          <ComponentProperties
            component={selectedComponentData}
            onUpdate={handleUpdateComponent}
          />
        )}
      </div>
    </div>
  );
}

export default App;