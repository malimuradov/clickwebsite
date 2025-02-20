import React from 'react';

function Stats({ cps, bestCps, totalClicks }) {
  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <p>CPS: {cps}</p>
      <p>Best CPS: {bestCps}</p>
      <p>Total Clicks: {totalClicks}</p>
    </div>
  );
}

export default Stats;