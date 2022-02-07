import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import Box from '@mui/material/Box';
import SplitButton from 'src/components/SplitButton';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import { downloadText } from 'src/data/file';
import { useCommands } from 'src/components/MissionControl';
import {
  useImportConnection,
  useConnectionQueries,
  useGetConnections,
  getExportedConnection,
  getExportedQuery,
} from 'src/hooks';

export default function NewConnectionButton() {
  const { selectCommand } = useCommands();

  const options = [
    {
      label: 'Import',
      onClick: () => selectCommand({ event: 'clientEvent/import' }),
      startIcon: <ArrowDownwardIcon />,
    },
    {
      label: 'Export All',
      onClick: () => selectCommand({ event: 'clientEvent/exportAll' }),
      startIcon: <ArrowUpwardIcon />,
    },
    {
      label: 'Collapse All Connections',
      onClick: () => selectCommand({ event: 'clientEvent/clearShowHides' }),
      startIcon: <UnfoldLessIcon />,
    },
  ];

  return (
    <Box sx={{ textAlign: 'center', marginBottom: 2, marginTop: 1 }}>
      <SplitButton
        id='new-connection-split-button'
        label='Connection'
        startIcon={<AddIcon />}
        onClick={() => selectCommand({ event: 'clientEvent/connection/new' })}
        options={options}
      />
    </Box>
  );
}
