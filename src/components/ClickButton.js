import React from 'react';

function ClickButton({ onClick }) {
  return (
    <button onMouseDown={onClick} style={{ fontSize: '24px', padding: '10px 20px' }}>
      Click Me!
    </button>
  );
}

export default ClickButton;