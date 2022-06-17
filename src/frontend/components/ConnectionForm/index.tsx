import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import ConnectionHint from 'src/frontend/components/ConnectionForm/ConnectionHint';
import TestConnectionButton from 'src/frontend/components/TestConnectionButton';
import Toast from 'src/frontend/components/Toast';
import { useGetConnectionById, useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { createSystemNotification } from 'src/frontend/utils/commonUtils';
import { SqluiCore } from 'typings';

type ConnectionFormProps = {
  id?: string;
};

export function NewConnectionForm() {
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const [showHint, setShowHint] = useState(true);
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    const newConnection = await mutateAsync({
      name,
      connection,
    });

    createSystemNotification(`Connection "${name}" created`);

    // when done, go back to the main page
    navigate(`/`, { replace: true });
  };

  const onApplyConnectionHint = (dialect, connection) => {
    setName(`${dialect} Connection - ${new Date().toLocaleDateString()}`);
    setConnection(connection);
    setShowHint(false);
  };
  if (showHint) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography>Select one of the following connection type</Typography>
        <ConnectionHint onChange={onApplyConnectionHint} />
        <Box>
          <Button variant='outlined' type='button' onClick={() => navigate('/')}>
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
    />
  );
}

export function EditConnectionForm(props: ConnectionFormProps) {
  const { id } = props;
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { data: initialConnection, isLoading: loading } = useGetConnectionById(id);
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    await mutateAsync({
      id,
      name,
      connection,
    });

    // when done, go back to the main page
    navigate(`/`, { replace: true });
  };

  // set the data for existing form
  useEffect(() => {
    setName(initialConnection?.name || '');
    setConnection(initialConnection?.connection || '');
  }, [initialConnection]);

  if (!loading && !initialConnection) {
    return (
      <Alert severity='error'>
        This connection couldn't be found. It might have been deleted....
        <strong onClick={() => navigate(`/`, { replace: true })} style={{ cursor: 'pointer' }}>
          Click here to go back to the main query page
        </strong>
      </Alert>
    );
  }

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
      loading={loading}
    />
  );
}

type MainConnectionFormProps = {
  onSave: () => Promise<void>;
  name: string;
  setName: (newVal: string) => void;
  connection: string;
  setConnection: (newVal: string) => void;
  saving?: boolean;
  loading?: boolean;
};

function MainConnectionForm(props: MainConnectionFormProps) {
  const navigate = useNavigate();
  const [toastOpen, setToastOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSqliteDatabasePathSelection, setShowSqliteDatabasePathSelection] = useState(false);

  // effects
  useEffect(() => {
    setShowSqliteDatabasePathSelection(props.connection?.indexOf('sqlite://') === 0);
  }, [props.connection]);

  // events
  const onSqliteDatabaseFileSelectionChange = (files: FileList | null) => {
    try {
      if (files) {
        const [file] = files;
        let { path } = file;
        props.setConnection(`sqlite://${path}`);
      }
    } catch (err) {}
  };

  const onSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setToastOpen(true);
    try {
      await props.onSave();
      // setToastOpen(false)
    } catch (err) {
      // setToastOpen(false)
    }
  };

  if (props.loading) {
    return <Alert severity='info'>Loading connection. Please wait....</Alert>;
  }

  const connection: SqluiCore.CoreConnectionProps = {
    name: props.name,
    connection: props.connection,
  };

  const onApplyConnectionHint = (dialect, connection) => {
    props.setName(`${dialect} Connection - ${new Date().toLocaleDateString()}`);
    props.setConnection(connection);
    setShowHint(false);
  };

  return (
    <form className='ConnectionForm FormInput__Container' onSubmit={onSave}>
      <div className='FormInput__Row'>
        <TextField
          label='Name'
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          required
          size='small'
          fullWidth={true}
          autoComplete='off'
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Connection'
          value={props.connection}
          onChange={(e) => props.setConnection(e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      {showSqliteDatabasePathSelection && (
        <div className='FormInput__Row'>
          <input
            type='file'
            style={{ display: 'none' }}
            onChange={(e) => onSqliteDatabaseFileSelectionChange(e.target.files)}
            id='sqlite-file-selection'
          />
          <label htmlFor='sqlite-file-selection'>
            <Button variant='contained' component='span'>
              Browse for sqlite database
            </Button>
          </label>
        </div>
      )}
      <div className='FormInput__Row'>
        <Button variant='contained' type='submit' disabled={props.saving} startIcon={<SaveIcon />}>
          Save
        </Button>
        <Button
          variant='outlined'
          type='button'
          disabled={props.saving}
          onClick={() => navigate('/')}>
          Cancel
        </Button>
        <TestConnectionButton connection={connection} />
        <Button type='button' disabled={props.saving} onClick={() => setShowHint(!showHint)}>
          {showHint ? 'Hide Connection Hints' : 'Show Connection Hints'}
        </Button>
      </div>
      {showHint && (
        <div className='FormInput__Container'>
          <ConnectionHint onChange={onApplyConnectionHint} />
        </div>
      )}
      <Toast open={toastOpen} onClose={() => setToastOpen(false)} message='Connection Saved...' />
    </form>
  );
}
