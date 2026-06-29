import React, { useState } from 'react';
import axios from 'axios';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';

const Copilot = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/v1/chatbot/ask', {
        query: query,
        user_role: 'director'
      });

      setChatHistory([
        ...chatHistory,
        { type: 'user', text: query },
        { 
          type: 'ai', 
          text: response.data.response,
          actions: response.data.suggested_actions 
        }
      ]);
      setQuery('');
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const predefinedQueries = [
    "Why did coverage drop in Akwa Ibom?",
    "Which facilities are most at risk of vaccine stockout?",
    "Generate donor report for May",
    "Which LGA requires intervention?"
  ];

  return (
    <Container maxWidth="md" style={{ marginTop: '20px' }}>
      <Typography variant="h4" gutterBottom>
        AI Public Health Copilot
      </Typography>
      
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Ask any question about your public health data
      </Typography>

      <Paper style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <TextField
            fullWidth
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your health data..."
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAsk}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Ask'}
          </Button>
        </div>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Suggested questions:
        </Typography>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {predefinedQueries.map((q, index) => (
            <Button 
              key={index}
              variant="outlined" 
              size="small"
              onClick={() => setQuery(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      </Paper>

      <div className="chat-history">
        {chatHistory.map((message, index) => (
          <Card 
            key={index} 
            style={{ 
              marginBottom: '10px',
              backgroundColor: message.type === 'user' ? '#e3f2fd' : '#f5f5f5'
            }}
          >
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                {message.type === 'user' ? 'You' : 'AI Copilot'}
              </Typography>
              <Typography variant="body1">
                {message.text}
              </Typography>
              
              {message.actions && (
                <div style={{ marginTop: '10px' }}>
                  <Typography variant="body2" color="textSecondary">
                    Suggested actions:
                  </Typography>
                  <List dense>
                    {message.actions.map((action, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={action} />
                      </ListItem>
                    ))}
                  </List>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default Copilot;