import React, { useState } from 'react';

function Gambling({ totalClicks, onGamble }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [lotteryResult, setLotteryResult] = useState(null);

  const games = [
    { id: 'lottery', name: 'Lottery', description: 'Buy a ticket for a chance to win big!', cost: 100 },
    { id: 'blackjack', name: 'Blackjack', description: 'Play against the dealer. Get closer to 21 to win!', cost: 200 },
    { id: 'roulette', name: 'Roulette', description: 'Bet on numbers or colors and spin the wheel!', cost: 150 },
    { id: 'slotMachine', name: 'Slot Machine', description: 'Pull the lever and match symbols to win!', cost: 50 },
  ];

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setLotteryResult(null);
  };

  const handlePlay = () => {
    if (selectedGame && totalClicks >= selectedGame.cost) {
      onGamble(selectedGame.cost);

      if (selectedGame.id === 'lottery') {
        playLottery();
      } else {
        // Here you would implement the logic for other games
        alert(`Playing ${selectedGame.name}! Good luck!`);
      }
    }
  };

  const playLottery = () => {

    const winningNumber = Math.floor(Math.random() * 100) + 1;
    const playerNumber = Math.floor(Math.random() * 100) + 1;

    let winnings = 0;
    if (playerNumber === winningNumber) {
      winnings = selectedGame.cost * 50; // 50x payout for exact match
    } else if (Math.abs(playerNumber - winningNumber) <= 5) {
      winnings = selectedGame.cost * 2; // 2x payout for close match
    }

    setLotteryResult({
      playerNumber,
      winningNumber,
      winnings
    });

    if (winnings > 0) {
      onGamble(-winnings); // Negative cost means adding clicks
    }
  };
  return (
    <div>
      <h2>Gambling Games</h2>
      <p>Your clicks: {totalClicks}</p>
      <div>
        {games.map(game => (
          <button 
            key={game.id} 
            onClick={() => handleGameSelect(game)}
            style={{ backgroundColor: selectedGame === game ? 'lightblue' : 'white' }}
          >
            {game.name}
          </button>
        ))}
      </div>
      {selectedGame && (
        <div>
          <h3>{selectedGame.name}</h3>
          <p>{selectedGame.description}</p>
          <p>Cost: {selectedGame.cost} clicks</p>
          <button onClick={handlePlay} disabled={totalClicks < selectedGame.cost}>
            Play
          </button>
          {lotteryResult && selectedGame.id === 'lottery' && (
            <div>
              <p>Your number: {lotteryResult.playerNumber}</p>
              <p>Winning number: {lotteryResult.winningNumber}</p>
              <p>Winnings: {lotteryResult.winnings} clicks</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Gambling;
