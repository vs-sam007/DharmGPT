import { useState } from 'react';
import Home from './components/Home';
import ChatInterface from './components/ChatInterface';
import VoicePage from './components/VoicePage';
import './App.css'; // Has been cleared

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeMode, setActiveMode] = useState('krishna');

  const startChat = (mode) => {
    if (mode) {
      setActiveMode(mode);
    }
    setCurrentScreen('chat');
  };

  const startVoice = (mode) => {
    setActiveMode(mode || activeMode);
    setCurrentScreen('voice');
  };

  const backToChat = () => {
    setCurrentScreen('chat');
  };

  return (
    <div className="app-container">
      {currentScreen === 'home' && <Home onStart={startChat} />}
      {currentScreen === 'chat' && (
        <ChatInterface 
          onStartVoice={startVoice} 
          activeMode={activeMode}
          onModeChange={setActiveMode}
        />
      )}
      {currentScreen === 'voice' && (
        <VoicePage 
          onBack={backToChat} 
          activeMode={activeMode} 
        />
      )}
    </div>
  );
}

export default App;
