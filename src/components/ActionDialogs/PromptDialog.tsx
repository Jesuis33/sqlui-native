import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface PromptDialogProps {
  open: boolean;
  title: string;
  message: string;
  value?: string;
  saveLabel?: string;
  onSaveClick: (newValue: string) => void;
  onDismiss: () => void;
  isLongPrompt?: boolean;
}

export default function PromptDialog(props: PromptDialogProps) {
  const [value, setValue] = useState(props.value || '');
  const handleClose = () => {
    props.onDismiss();
  };

  const onSave = (e: React.SyntheticEvent) => {
    e.preventDefault();

    props.onSaveClick(value);
  };

  return (
    <Dialog onClose={handleClose} aria-labelledby='prompt-dialog-title' open={props.open}>
      <form onSubmit={onSave} style={{ width: 600 }}>
        <DialogTitle id='prompt-dialog-title'>
          {props.title}
          <IconButton
            aria-label='close'
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {props.isLongPrompt ? (
            <CodeEditor
              value={value}
              onChange={(e) => setValue(e.target.value)}
              language='json'
              padding={10}
              minHeight={400}
              style={{
                backgroundColor: '#f5f5f5',
                border: 'none',
                fontFamily: 'monospace',
              }}
              autoFocus
            />
          ) : (
            <TextField
              label={props.message}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              size='small'
              fullWidth
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button type='submit'>{props.saveLabel || 'Save Changes'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
