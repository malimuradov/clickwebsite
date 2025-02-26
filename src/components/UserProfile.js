import React, { useState, useEffect } from 'react';
import '../styles/UserProfile.css';

function UserProfile({ isOpen, onClose, isLoggedIn, onLogin, onLogout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  useEffect(() => {
    const storedTempUserId = localStorage.getItem('tempUserId');
    if (storedTempUserId) {
      setTempUserId(storedTempUserId);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          username: isRegistering ? username : undefined,
          tempUserId: isRegistering ? tempUserId : undefined
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          if (data.token) {
            localStorage.setItem('userToken', data.token);
            if (isRegistering) {
              localStorage.removeItem('tempUserId');
            }
            onLogin(data.token);
            console.log(isRegistering ? 'Registration successful' : 'Login successful');
            onClose();
          } else {
            setError('No token received from server');
          }
        } else {
          setError(data.message || 'An error occurred');
        }
      } else {
        const text = await response.text();
        console.error('Unexpected response:', text);
        setError('Unexpected response from server. Please try again later.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    onLogout();
    onClose();
  };
  if (!isOpen) return null;

  return (
    <div className="user-profile-overlay">
      <div className="user-profile-popup">
        <button className="close-button" onClick={onClose}>&times;</button>
        {isLoggedIn ? (
          <>
            <h2>User Profile</h2>
            <p>You are logged in.</p>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <h2>{isRegistering ? 'Register' : 'Login'}</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit}>
              {isRegistering && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
            </form>
            <p>
              {isRegistering
                ? 'Already have an account? '
                : "Don't have an account? "}
              <span onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? 'Login' : 'Register'}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default UserProfile;

