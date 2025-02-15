import React, { useRef, useState, useEffect } from 'react';

function DrawingCanvas() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 5;

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e) => {
    if (e.target === canvasRef.current) {
      const { offsetX, offsetY } = e.nativeEvent;
      setIsDrawing(true);
      draw(offsetX, offsetY);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (x, y) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.strokeStyle = isEraser ? '#FFFFFF' : color;
    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
  };

  const handleMouseMove = (e) => {
    if (e.target === canvasRef.current) {
      const { offsetX, offsetY } = e.nativeEvent;
      draw(offsetX, offsetY);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'drawing.png';
    link.click();
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={handleMouseMove}
        onMouseLeave={stopDrawing}
        style={{ cursor: 'crosshair' }}
      />
      <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 3 }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button onClick={() => setIsEraser(!isEraser)}>
          {isEraser ? 'Draw' : 'Erase'}
        </button>
        <button onClick={clearCanvas}>Clear</button>
        <button onClick={saveDrawing}>Save</button>
      </div>
    </>
  );
}

export default DrawingCanvas;
