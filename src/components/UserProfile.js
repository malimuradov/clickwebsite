import React, { useState, useEffect } from 'react';
import '../styles/UserProfile.css';

function UserProfile({ onClose, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(true);
  const [error, setError] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  useEffect(() => {
    // Retrieve the temporary user ID from localStorage
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
          tempUserId: isRegistering ? tempUserId : undefined // Include tempUserId only for registration
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
        // If the response is not JSON, log it and set a generic error
        const text = await response.text();
        console.error('Unexpected response:', text);
        setError('Unexpected response from server. Please try again later.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please try again.');
    }
  };


  return (
    <div className="user-profile-overlay">
      <div className="user-profile-popup">
        <h2>{isRegistering ? 'Register' : 'Login'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
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
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default UserProfile;
