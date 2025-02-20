import React from 'react';

function ClickButton({ onClick }) {
  return (
    <div 
      onMouseDown={onClick} 
      style={{
        width: '200px',
        height: '200px',
        backgroundColor: '#f0f0f0',
        border: '2px solid #ccc',
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
      }}
    >
      Click Here!
    </div>
  );
}

export default ClickButton;