import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { Person, Support, Info } from '@mui/icons-material';
import { format } from 'date-fns';

function MessageBubble({ message }) {
  const isOperator = message.role === 'operator';
  const isSystem = message.role === 'system';
  const isReporter = message.role === 'reporter';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isReporter ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      <Box sx={{ maxWidth: '70%' }}>
        {/* Role indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            justifyContent: isReporter ? 'flex-end' : 'flex-start'
          }}
        >
          {isOperator && (
            <Chip
              icon={<Support />}
              label="Operator"
              size="small"
              color="primary"
              sx={{ height: 20 }}
            />
          )}
          {isReporter && (
            <Chip
              icon={<Person />}
              label="You"
              size="small"
              color="default"
              sx={{ height: 20 }}
            />
          )}
          {isSystem && (
            <Chip
              icon={<Info />}
              label="System"
              size="small"
              color="info"
              sx={{ height: 20 }}
            />
          )}
        </Box>

        {/* Message bubble */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            backgroundColor: isReporter
              ? '#e3f2fd'
              : isSystem
              ? '#fff3e0'
              : '#f5f5f5',
            borderRadius: 2,
            borderTopLeftRadius: isReporter ? 16 : 2,
            borderTopRightRadius: isReporter ? 2 : 16
          }}
        >
          <Typography
            component="div"
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              '& strong': {
                fontWeight: 'bold',
                color: isSystem ? '#ff6b35' : 'inherit'
              },
              '& ul, & ol': {
                paddingLeft: '20px',
                marginTop: '8px',
                marginBottom: '8px'
              },
              '& li': {
                marginBottom: '4px'
              }
            }}
            dangerouslySetInnerHTML={{
              __html: message.message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/•/g, '<li>')
                .replace(/\n/g, '<br/>')
                .replace(/<li>/g, '</li><li>')
                .replace(/^<\/li>/, '')
                .replace(/<li>(.*?)<br\/>/g, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
            }}
          />
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 1, display: 'block', textAlign: isReporter ? 'right' : 'left' }}
          >
            {format(new Date(message.timestamp), 'HH:mm')}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

export default MessageBubble;