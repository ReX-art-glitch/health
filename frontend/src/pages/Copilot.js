import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Card, CardContent,
  Chip, CircularProgress, Divider, List, ListItem, ListItemIcon,
  ListItemText, IconButton
} from '@mui/material';
import { Send, SmartToy, Person, ContentCopy, Refresh } from '@mui/icons-material';
import api from '../services/api';

const Copilot = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await api.post('/chatbot/ask', { query: userMessage.content });
      const aiMessage = { role: 'assistant', content: response.data.response, suggestions: response.data.suggested_actions };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const predefinedQueries = [
    "Why did coverage drop in Akwa Ibom?",
    "Which facilities are at risk of stockout?",
    "Generate donor report for May",
    "Which LGA requires intervention?",
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>AI Public Health Copilot</Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Ask any question about your public health data
      </Typography>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {chatHistory.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SmartToy sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">How can I help you today?</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {predefinedQueries.map((q, i) => (
                  <Chip key={i} label={q} onClick={() => setQuery(q)} clickable />
                ))}
              </Box>
            </Box>
          )}

          {chatHistory.map((msg, index) => (
            <Card key={index} sx={{ mb: 2, backgroundColor: msg.role === 'user' ? '#E3F2FD' : msg.error ? '#FFEBEE' : '#F5F5F5' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {msg.role === 'user' ? <Person color="primary" /> : <SmartToy color={msg.error ? 'error' : 'secondary'} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      {msg.role === 'user' ? 'You' : 'AI Copilot'}
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </Typography>
                    {msg.suggestions && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">Suggested actions:</Typography>
                        <List dense>
                          {msg.suggestions.map((s, i) => (
                            <ListItem key={i} sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                              <ListItemText primary={s} primaryTypographyProps={{ variant: 'body2' }} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                  {msg.role === 'assistant' && (
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(msg.content)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          <div ref={chatEndRef} />
        </Box>

        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask a question about your health data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              multiline
              maxRows={4}
            />
            <Button variant="contained" onClick={handleSend} disabled={loading || !query.trim()} sx={{ minWidth: 100 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : <Send />}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Copilot;