import HelpIcon from '@mui/icons-material/Help';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React from 'react';
import { ALL_PAGE_SIZE_OPTIONS, DEFAULT_TABLE_PAGE_SIZE } from 'src/frontend/components/DataTable';
import Select from 'src/frontend/components/Select';
import { useQuerySizeSetting, useSetting } from 'src/frontend/hooks/useSetting';
import { SqluiFrontend } from 'typings';

type SettingsProps = {};

export default function Settings(props: SettingsProps): JSX.Element | null {
  const { isLoading, settings, onChange } = useSetting();
  const querySize = useQuerySizeSetting();

  const onSettingChange = (key: SqluiFrontend.SettingKey, value: any) => {
    if (!settings) {
      return;
    }

    onChange({
      ...settings,
      ...{ [key]: value },
    });
  };

  let contentDom: React.ReactNode;

  if (isLoading) {
    contentDom = <>Loading...</>;
  } else if (!settings) {
    contentDom = null;
  } else {
    contentDom = (
      <>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Theme Mode
          <Tooltip title='Application theme mode. Dark mode or light mode or follows system preference'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.darkMode}
            onChange={(newValue) => onSettingChange('darkMode', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>Follows System Settings</option>
            <option value='dark'>Prefers Dark Mode</option>
            <option value='light'>Prefers Light Mode</option>
          </Select>
        </div>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Query Selection Mode
          <Tooltip title='Whether or not to open the bookmarked query in a new tab or in the same tab.'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.querySelectionMode || 'new-tab'}
            onChange={(newValue) => onSettingChange('querySelectionMode', newValue)}
            sx={{ width: '100%' }}>
            <option value='same-tab'>Same Tab</option>
            <option value='new-tab'>New Tab</option>
          </Select>
        </div>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Editor Mode
          <Tooltip title='Which editor to use? Simple Editor vs Advanced Editor'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.editorMode || 'advanced'}
            onChange={(newValue) => onSettingChange('editorMode', newValue)}
            sx={{ width: '100%' }}>
            <option value='advanced'>Advanced Mode</option>
            <option value='simple'>Simple Mode</option>
          </Select>
        </div>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Editor Word Wrap
          <Tooltip title='Whether or not to wrap words inside of the editor by default'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.wordWrap}
            onChange={(newValue) => onSettingChange('wordWrap', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>No wrap</option>
            <option value='wrap'>Wrap</option>
          </Select>
        </div>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Query Tab Orientation
          <Tooltip title='Query Tabs Orientation. Vertical tabs vs Horizontal tabs'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.queryTabOrientation}
            onChange={(newValue) => onSettingChange('queryTabOrientation', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>Application will find which orientation best fit</option>
            <option value='horizontal'>Horizontal</option>
            <option value='vertical'>Vertical</option>
          </Select>
        </div>
        <Typography className='FormInput__Label' variant='subtitle1'>
          Query Size
          <Tooltip title='The default query size for Select SQL statements. Note this change only apply to future queries.'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <TextField
            defaultValue={settings.querySize || querySize}
            onBlur={(e) => onSettingChange('querySize', e.target.value)}
            required
            size='small'
            fullWidth={true}
            type='number'
          />
        </div>
        {/*
          <Typography className='FormInput__Label' variant='subtitle1'>
            Table Page Size
            <Tooltip title='The default table page size used for results table. Note this change only apply to future results.'>
              <HelpIcon fontSize='small' sx={{ ml: 1 }} />
            </Tooltip>
          </Typography>
          <div className='FormInput__Row'>
            <Select
              value={settings.tablePageSize || DEFAULT_TABLE_PAGE_SIZE}
              onChange={(newValue) => onSettingChange('tablePageSize', newValue)}
              sx={{ width: '100%' }}>
              {ALL_PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option value={pageSize.value} key={pageSize.value}>
                  {pageSize.label}
                </option>
              ))}
            </Select>
          </div>
        */}
        <Typography className='FormInput__Label' variant='subtitle1'>
          Delete Mode
          <Tooltip title='Whether or not to do soft delete and put deleted items into the recycle bin or hard delete to delete it permanently.'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <ChangeSoftDeleteInput />
        </div>
      </>
    );
  }

  return <>{contentDom}</>;
}

export function ChangeSoftDeleteInput() {
  const { isLoading, settings, onChange } = useSetting();

  const onSettingChange = (key: SqluiFrontend.SettingKey, value: any) => {
    if (!settings) {
      return;
    }

    onChange({
      ...settings,
      ...{ [key]: value },
    });
  };

  if (isLoading || !settings) {
    return null;
  }

  return (
    <Select
      value={settings.deleteMode || 'soft-delete'}
      onChange={(newValue) => onSettingChange('deleteMode', newValue)}
      sx={{ width: '100%' }}>
      <option value='soft-delete'>Soft Delete (Put to Recycle Bin)</option>
      <option value='hard-delete'>Hard Delete (Permanent Delete)</option>
    </Select>
  );
}
