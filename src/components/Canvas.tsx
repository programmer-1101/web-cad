import React, { useRef, useState, useCallback } from 'react';
import { ComponentType, CircuitComponent, Wire, ToolMode } from '../models/types';
import './Canvas.css';

interface CanvasProps {
    selectedComponent: ComponentType;
    components: CircuitComponent[];
    setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
    wires: Wire[];
    setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
    selectedItem: { type: 'component' | 'wire', id: string } | null;
    setSelectedItem: React.Dispatch<React.SetStateAction<{ type: 'component' | 'wire', id: string } | null>>;
    toolMode: ToolMode;
}

const GRID_SIZE = 20;
const COMPONENT_SIZE = 40;

const Canvas: React.FC<CanvasProps> = ({
    selectedComponent,
    components,
    setComponents,
    wires,
    setWires,
    selectedItem,       // Now properly included in props
    setSelectedItem,    // Now properly included in props
    toolMode,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [connectingWire, setConnectingWire] = useState<{
        fromComponentId: string;
        fromNode: number;
        currentX: number;
        currentY: number;
    } | null>(null);
    const [dragging, setDragging] = useState<{
        id: string;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

    // Snap coordinate to grid
    const snap = useCallback((coord: number) => Math.round(coord / GRID_SIZE) * GRID_SIZE, []);

    // Get node position for wiring
    const getNodePosition = useCallback((comp: CircuitComponent, node: number) => {
        if (node === 0) return { x: comp.x, y: comp.y + COMPONENT_SIZE / 2 };
        return { x: comp.x + COMPONENT_SIZE, y: comp.y + COMPONENT_SIZE / 2 };
    }, []);

    // Add component on canvas click (in add mode)
    const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (!svgRef.current || toolMode !== 'add') return;

        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorpt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        const x = snap(cursorpt.x - COMPONENT_SIZE / 2);
        const y = snap(cursorpt.y - COMPONENT_SIZE / 2);

        const newComp: CircuitComponent = {
            id: Date.now().toString(),
            type: selectedComponent,
            x,
            y,
            value: getDefaultComponentValue(selectedComponent),
        };
        setComponents([...components, newComp]);
    };

    // Handle mouse down on component (start drag in select mode)
    const handleMouseDown = (compId: string, e: React.MouseEvent) => {
        if (toolMode !== 'select' || !svgRef.current) return;
        e.stopPropagation();

        const comp = components.find(c => c.id === compId);
        if (!comp) return;

        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        setSelectedComponentId(compId);
        setDragging({
            id: compId,
            offsetX: cursorPt.x - comp.x,
            offsetY: cursorPt.y - comp.y
        });
    };

    // Handle mouse move for dragging
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;

        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        // Handle component dragging
        if (dragging) {
            setComponents(components.map(comp => {
                if (comp.id === dragging.id) {
                    return {
                        ...comp,
                        x: snap(cursorPt.x - dragging.offsetX),
                        y: snap(cursorPt.y - dragging.offsetY)
                    };
                }
                return comp;
            }));
        }

        // Update connecting wire preview
        if (connectingWire) {
            setConnectingWire({
                ...connectingWire,
                currentX: cursorPt.x,
                currentY: cursorPt.y
            });
        }
    };

    // Handle mouse up to end drag or connection
    const handleMouseUp = () => {
        setDragging(null);
    };

    // Handle node click for wiring
    const handleNodeClick = (compId: string, node: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (toolMode !== 'add' || !svgRef.current) return;

        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        if (!connectingWire) {
            setConnectingWire({
                fromComponentId: compId,
                fromNode: node,
                currentX: cursorPt.x,
                currentY: cursorPt.y
            });
        } else {
            if (connectingWire.fromComponentId === compId && connectingWire.fromNode === node) {
                setConnectingWire(null);
                return;
            }
            const newWire: Wire = {
                id: Date.now().toString(),
                fromComponentId: connectingWire.fromComponentId,
                fromNode: connectingWire.fromNode,
                toComponentId: compId,
                toNode: node,
            };
            setWires([...wires, newWire]);
            setConnectingWire(null);
        }
    };

    // Render component shapes
    const renderComponent = (comp: CircuitComponent) => {
        const { x, y, type, value, id, subtype } = comp;
        const isSelected = selectedItem?.type === 'component' && selectedItem.id === id;

        // Common node rendering
        const renderNodes = () => (
            <>
                <circle
                    cx={x}
                    cy={y + COMPONENT_SIZE / 2}
                    r={6}
                    fill="white"
                    stroke={isSelected ? "#007acc" : "black"}
                    onClick={(e) => handleNodeClick(id, 0, e)}
                />
                <circle
                    cx={x + COMPONENT_SIZE}
                    cy={y + COMPONENT_SIZE / 2}
                    r={6}
                    fill="white"
                    stroke={isSelected ? "#007acc" : "black"}
                    onClick={(e) => handleNodeClick(id, 1, e)}
                />
            </>
        );

        switch (type) {
            case 'resistor':
                return (
                    <g key={id} onMouseDown={(e) => handleMouseDown(id, e)}>
                        {/* Resistor rendering */}
                    </g>
                );
            case 'capacitor':
                return (
                    <g key={id} onMouseDown={(e) => handleMouseDown(id, e)}>
                        <rect x={x + COMPONENT_SIZE / 3} y={y} width={4} height={COMPONENT_SIZE} fill="#80f0ff" />
                        <rect x={x + COMPONENT_SIZE * 2 / 3 - 4} y={y} width={4} height={COMPONENT_SIZE} fill="#80f0ff" />
                        <text x={x + COMPONENT_SIZE / 2} y={y + COMPONENT_SIZE + 14} textAnchor="middle">
                            C={value}F
                        </text>
                        {renderNodes()}
                    </g>
                );
            case 'diode':
                return (
                    <g key={id} onMouseDown={(e) => handleMouseDown(id, e)} stroke="red" strokeWidth={2} fill="none">
                        <polygon points={`
            ${x + COMPONENT_SIZE * 0.2},${y} 
            ${x + COMPONENT_SIZE * 0.8},${y + COMPONENT_SIZE / 2} 
            ${x + COMPONENT_SIZE * 0.2},${y + COMPONENT_SIZE}
          `} />
                        <line x1={x + COMPONENT_SIZE * 0.8} y1={y} x2={x + COMPONENT_SIZE * 0.8} y2={y + COMPONENT_SIZE} />
                        <text x={x + COMPONENT_SIZE / 2} y={y + COMPONENT_SIZE + 14} textAnchor="middle" fill="red">
                            D={value}V
                        </text>
                        {renderNodes()}
                    </g>
                );
            // Add cases for other components...
            default:
                return null;
        }
    };

    // Render wires
    const renderWires = () => {
        return wires.map((wire) => {
            const fromComp = components.find(c => c.id === wire.fromComponentId);
            const toComp = components.find(c => c.id === wire.toComponentId);
            if (!fromComp || !toComp) return null;

            const fromPos = getNodePosition(fromComp, wire.fromNode);
            const toPos = getNodePosition(toComp, wire.toNode);

            return (
                <line
                    key={wire.id}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="#333"
                    strokeWidth={2}
                />
            );
        });
    };

    // Render connecting wire preview
    const renderConnectingWire = () => {
        if (!connectingWire) return null;

        const fromComp = components.find(c => c.id === connectingWire.fromComponentId);
        if (!fromComp) return null;

        const fromPos = getNodePosition(fromComp, connectingWire.fromNode);
        return (
            <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={connectingWire.currentX}
                y2={connectingWire.currentY}
                stroke="#007acc"
                strokeWidth={2}
                strokeDasharray="5,5"
            />
        );
    };

    return (
        <svg
            ref={svgRef}
            className="canvas"
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            width="100%"
            height="100%"
            style={{ display: 'block' }} // Add this to prevent spacing issues
        >
            {/* Background grid with fixed pattern */}
            <defs>
                <pattern
                    id="grid-pattern"
                    width={GRID_SIZE}
                    height={GRID_SIZE}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                        fill="none"
                        stroke="#e0e0e0"
                        strokeWidth="1"
                    />
                </pattern>
            </defs>
            <rect
                width="100%"
                height="100%"
                fill="url(#grid-pattern)"
            />

            {/* Wires */}
            {renderWires()}
            {renderConnectingWire()}

            {/* Components */}
            {components.map(renderComponent)}
        </svg>
    );
};

// Helper function for default component values
function getDefaultComponentValue(type: ComponentType): number {
    switch (type) {
        case 'resistor': return 100;
        case 'voltage': return 5;
        case 'capacitor': return 1e-6;
        case 'inductor': return 1e-3;
        case 'diode': return 0.7;
        default: return 0;
    }
}

export default Canvas;