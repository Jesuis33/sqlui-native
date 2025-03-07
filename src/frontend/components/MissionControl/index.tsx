import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import { getCodeSnippet } from 'src/common/adapters/DataScriptFactory';
import { BookmarksItemListModalContent } from 'src/frontend/components/BookmarksItemList';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import CommandPalette from 'src/frontend/components/CommandPalette';
import ConnectionHelper from 'src/frontend/components/ConnectionHelper';
import SessionSelectionForm from 'src/frontend/components/SessionSelectionForm';
import Settings, { ChangeSoftDeleteInput } from 'src/frontend/components/Settings';
import { downloadText } from 'src/frontend/data/file';
import { getRandomSessionId } from 'src/frontend/data/session';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useDeleteConnection,
  useDuplicateConnection,
  useGetConnectionById,
  useGetConnections,
  useImportConnection,
  useRetryConnection,
} from 'src/frontend/hooks/useConnection';
import {
  useActiveConnectionQuery,
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';
import { useAddBookmarkItem } from 'src/frontend/hooks/useFolderItems';
import { useGetServerConfigs } from 'src/frontend/hooks/useServerConfigs';
import {
  useCloneSession,
  useDeleteSession,
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSelectSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useIsSoftDeleteModeSetting, useSetting } from 'src/frontend/hooks/useSetting';
import { useShowHide } from 'src/frontend/hooks/useShowHide';
import useToaster from 'src/frontend/hooks/useToaster';
import {
  createSystemNotification,
  getExportedConnection,
  getExportedQuery,
} from 'src/frontend/utils/commonUtils';
import { execute } from 'src/frontend/utils/executeUtils';
import { RecordDetailsPage } from 'src/frontend/views/RecordPage';
import appPackage from 'src/package.json';
import { SqluiCore, SqluiEnums, SqluiFrontend } from 'typings';

export type Command = {
  event: SqluiEnums.ClientEventKey;
  data?: unknown;
  label?: string;
};

const QUERY_KEY_COMMAND_PALETTE = 'commandPalette';

const _commands: Command[] = [];

export function useCommands() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_COMMAND_PALETTE, () => _commands);

  const command = _commands[_commands.length - 1];

  const selectCommand = (command: Command) => {
    _commands.push(command);
    queryClient.invalidateQueries(QUERY_KEY_COMMAND_PALETTE);
  };

  const dismissCommand = () => {
    if (_commands.length > 0) {
      _commands.pop();
    }
    queryClient.invalidateQueries(QUERY_KEY_COMMAND_PALETTE);
  };

  return {
    command,
    selectCommand,
    dismissCommand,
  };
}

/**
 * These are all the menu keys that should be disabled when the query tab
 * is not visible. Triggering these events in the background will be confusing
 * @type {Array}
 */
export const allMenuKeys = [
  'menu-connection-new',
  'menu-import',
  'menu-export',
  'menu-query-new',
  'menu-query-rename',
  'menu-query-help',
  'menu-query-prev',
  'menu-query-next',
  'menu-query-close',
  'menu-session-new',
  'menu-session-rename',
  'menu-session-switch',
  'menu-session-delete',
];

export default function MissionControl() {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const connectionQueries = useConnectionQueries();
  const { queries, isLoading: loadingQueries } = connectionQueries;
  const { query: activeQuery, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const { command, selectCommand, dismissCommand } = useCommands();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: serverConfigs } = useGetServerConfigs();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: cloneSession } = useCloneSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { mutateAsync: importConnection } = useImportConnection();
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { settings, onChange: onChangeSettings } = useSetting();
  const isSoftDeleteModeSetting = useIsSoftDeleteModeSetting();
  const {
    onClear: onClearConnectionVisibles,
    onToggle: onToggleConnectionVisible,
    onSet: onSetConnectionVisible,
  } = useShowHide();
  const { data: activeConnection } = useGetConnectionById(activeQuery?.connectionId);
  const { add: addToast } = useToaster();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { mutateAsync: addBookmarkItem } = useAddBookmarkItem();

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        const onUndoConnection = async () => {
          curToast?.dismiss();
          await connectionQueries.onAddQuery({ ...query });
        };

        const curToast = await addToast({
          message: <>Query "{query.name}" closed.</>,
          action: (
            <>
              <Button size='small' onClick={onUndoConnection}>
                UNDO
              </Button>
            </>
          ),
        });

        await connectionQueries.onDeleteQueries([query.id]);
      };

      await modal({
        title: 'Confirmation?',
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>Do you want to delete this query "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: 'auto', display: 'flex', gap: 3 }}>
                <Button size='small' onClick={dismissDialog}>
                  No
                </Button>
                <Button type='submit' variant='contained' size='small'>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: 'xs',
      });
    } catch (err) {}
  };

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        const queriesToClose = queries?.filter((q) => q.id !== query.id) || [];

        const onUndoQueries = async () => {
          curToast?.dismiss();
          await connectionQueries.onAddQueries(queriesToClose);
        };

        const curToast = await addToast({
          message: <>Multiple queries closed.</>,
          action: (
            <>
              <Button size='small' onClick={onUndoQueries}>
                UNDO
              </Button>
            </>
          ),
        });

        await connectionQueries.onDeleteQueries(queriesToClose?.map((q) => q.id));
      };

      await modal({
        title: 'Confirmation?',
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>Do you want to close other queries except "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: 'auto', display: 'flex', gap: 3 }}>
                <Button size='small' onClick={dismissDialog}>
                  No
                </Button>
                <Button type='submit' variant='contained' size='small'>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: 'xs',
      });

      await _onSubmit();
    } catch (err) {}
  };

  const onCloseQueriesToTheRight = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        if (!queries || queries.length <= 1) {
          return;
        }

        // find the target idx
        let targetIdx: number = -1;
        for (let i = 0; i < queries.length; i++) {
          if (queries[i].id === query.id) {
            targetIdx = i;
            break;
          }
        }

        if (targetIdx >= 0) {
          const queriesToClose = queries.filter((_q, idx) => idx > targetIdx);

          const onUndoQueries = async () => {
            curToast?.dismiss();
            await connectionQueries.onAddQueries(queriesToClose);
          };

          const curToast = await addToast({
            message: <>Multiple queries closed.</>,
            action: (
              <>
                <Button size='small' onClick={onUndoQueries}>
                  UNDO
                </Button>
              </>
            ),
          });

          await connectionQueries.onDeleteQueries(queriesToClose.map((q) => q.id));
          await connectionQueries.onShowQuery(query.id);
        }
      };

      await modal({
        title: 'Confirmation?',
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>Do you want to close all the queries to the right of "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: 'auto', display: 'flex', gap: 3 }}>
                <Button size='small' onClick={dismissDialog}>
                  No
                </Button>
                <Button type='submit' variant='contained' size='small'>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: 'xs',
      });

      await _onSubmit();
    } catch (err) {}
  };

  const onRenameQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const newName = await prompt({
        title: 'Rename Query',
        message: 'New Query Name',
        value: query.name,
        saveLabel: 'Save',
      });
      await connectionQueries.onChangeQuery(query.id, {
        name: newName,
      });
    } catch (err) {}
  };

  const onDuplicateQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    const curToast = await addToast({
      message: `Duplicating "${query.name}", please wait...`,
    });
    await connectionQueries.onDuplicateQuery(query.id);
  };

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    const curToast = await addToast({
      message: `Exporting Query "${query.name}", please wait...`,
    });

    downloadText(
      `${query.name}.query.json`,
      JSON.stringify([getExportedQuery(query)], null, 2),
      'text/json',
    );
  };

  const onAddQueryToBookmark = async (query: SqluiFrontend.ConnectionQuery) => {
    const newName = await prompt({
      title: 'Add query to Bookmarks',
      message: 'A bookmark name',
      value: `${query.name || ''} - ${new Date().toLocaleString()}`,
      saveLabel: 'Save',
    });

    const { selected, ...restOfQuery } = query;

    addBookmarkItem({
      type: 'Query',
      name: newName,
      data: restOfQuery,
    });

    const curToast = await addToast({
      message: `Query "${newName}" added to Bookmarks.`,
    });
  };

  const onRevealQueryConnection = async (
    query: SqluiFrontend.ConnectionQuery,
    showOnlyRevealedConnection: boolean,
  ) => {
    const { connectionId, databaseId, tableId } = query;

    if (!connectionId) {
      return;
    }

    const branchesToReveal: string[] = [connectionId];

    if (databaseId && connectionId) {
      branchesToReveal.push([connectionId, databaseId].join(' > '));

      if (tableId) {
        branchesToReveal.push([connectionId, databaseId, tableId].join(' > '));
      }
    }

    if (showOnlyRevealedConnection === true) {
      // hide everything else, only reveal this set of connection
      const newVisibles = {};
      for (const branchToReveal of branchesToReveal) {
        // reveal
        newVisibles[branchToReveal] = true;
      }

      onSetConnectionVisible(newVisibles);
    } else {
      for (const branchToReveal of branchesToReveal) {
        // reveal
        onToggleConnectionVisible(branchToReveal, true);
      }
    }

    if (showOnlyRevealedConnection === false) {
      const curToast = await addToast({
        message: `Revealed selected connection / database on the sidebar`,
      });
    }

    // scroll to the selected dom
    setTimeout(() => {
      const selectedHeaders = document.querySelectorAll('.Accordion__Header.selected');
      selectedHeaders[selectedHeaders.length - 1].scrollIntoView();
    }, 100);
  };

  const onApplyQuery = async (
    data: SqluiFrontend.PartialConnectionQuery,
    openQueryInNewTab: boolean,
    toastMessage: string | undefined,
  ) => {
    if (openQueryInNewTab === true) {
      let newQueryTabName = `Query ${new Date().toLocaleString()}`;

      if (data.databaseId) {
        newQueryTabName += ` - ${data.databaseId}`;
      }

      await connectionQueries.onAddQuery({
        ...data,
        name: newQueryTabName,
      });
    } else {
      onChangeActiveQuery(data);
    }

    if (toastMessage) {
      await addToast({
        message: toastMessage,
      });
    }
  };

  const onPinQuery = async (query: SqluiFrontend.ConnectionQuery, pinned: boolean) => {
    await connectionQueries.onChangeQuery(query.id, {
      pinned,
    });

    await addToast({
      message: `Query "${query.name}" ${pinned ? 'pinned' : 'unpinned'}`,
    });
  };

  const onShowQueryHelp = async () => {
    let data: string;

    if (activeConnection && activeConnection.dialect) {
      // open query help with selected dialect
      data = `https://synle.github.io/sqlui-native/guides#${activeConnection.dialect}`;
    } else {
      data = `https://synle.github.io/sqlui-native/guides`;
    }

    selectCommand({ event: 'clientEvent/openExternalUrl', data });
  };

  const onShowQueryWithDirection = async (direction: number) => {
    if (!queries || !activeQuery) {
      return;
    }

    let targetIdx = queries?.findIndex((q) => q.id === activeQuery.id);

    if (targetIdx !== -1) {
      targetIdx = targetIdx + direction;

      // these are handler to rotate the search
      if (targetIdx >= queries.length) {
        targetIdx = 0;
      }

      if (targetIdx < 0) {
        targetIdx = queries.length - 1;
      }

      // then show that tab
      await connectionQueries.onShowQuery(queries[targetIdx].id);
    }
  };

  const onChangeSession = async () => {
    if (!sessions) {
      return;
    }

    try {
      await modal({
        title: 'Change Session',
        message: <SessionSelectionForm isFirstTime={false} />,
        size: 'sm',
      });
    } catch (err) {}
  };

  const onAddSession = async (onClose?: () => void) => {
    try {
      // create the new session
      // if there is no session, let's create the session
      const newSessionName = await prompt({
        title: 'New Session',
        message: 'New Session Name',
        value: `Session ${new Date().toLocaleString()}`,
        saveLabel: 'Save',
        required: true,
      });

      if (!newSessionName) {
        return;
      }

      const newSession = await upsertSession({
        id: getRandomSessionId(),
        name: newSessionName,
      });

      if (!newSession) {
        return;
      }

      selectSession(newSession.id);
    } catch (err) {
      if (onClose) {
        onClose();
      }
    }
  };

  const onCloneSession = async (targetSession: SqluiCore.Session) => {
    try {
      // create the new session
      // if there is no session, let's create the session
      const newSessionName = await prompt({
        title: 'Clone Session',
        message: 'New Session Name',
        value: `Cloned Session ${new Date().toLocaleString()}`,
        saveLabel: 'Save',
        required: true,
      });

      if (!newSessionName) {
        return;
      }

      const newSession = await cloneSession({
        id: targetSession.id,
        name: newSessionName,
      });

      if (!newSession) {
        return;
      }

      selectSession(newSession.id);
    } catch (err) {}
  };

  const onRenameSession = async (targetSession: SqluiCore.Session) => {
    try {
      if (!targetSession) {
        return;
      }

      const newSessionName = await prompt({
        title: 'Rename Session',
        message: 'New Session Session',
        value: targetSession.name,
        saveLabel: 'Save',
      });

      if (!newSessionName) {
        return;
      }

      await upsertSession({
        ...targetSession,
        name: newSessionName,
      });
    } catch (err) {}
  };

  const onDeleteSession = async (targetSession: SqluiCore.Session) => {
    try {
      if (!targetSession) {
        return;
      }

      await confirm(
        `Do you want to delete this session "${targetSession.name}"? This will also close any window associated with this sessionId.`,
      );
      await deleteSession(targetSession.id);

      if (targetSession.id === currentSession?.id) {
        // after you delete a session, we should close it
        if (!window.isElectron) {
          alert(`Session is deleted. Please close this windows.`);
        }
      }
    } catch (err) {}
  };

  const onExportAll = async () => {
    const curToast = await addToast({
      message: `Exporting All Connections and Queries, please wait...`,
    });

    let jsonContent: any[] = [];

    // TODO: implement export all
    if (connections) {
      for (const connection of connections) {
        jsonContent.push(getExportedConnection(connection));
      }
    }

    if (queries) {
      for (const query of queries) {
        jsonContent.push(getExportedQuery(query));
      }
    }

    downloadText(
      `${new Date().toLocaleString()}.sqlui_native.json`,
      JSON.stringify(jsonContent, null, 2),
      'text/json',
    );
  };

  const onNewConnection = useCallback(() => navigate('/connection/new'), []);

  const onDeleteConnection = async (connection: SqluiCore.ConnectionProps) => {
    let curToast;
    try {
      const _onSubmit = async () => {
        try {
          await deleteConnection(connection.id);

          const onUndoConnection = async () => {
            curToast?.dismiss();
            await duplicateConnection(connection);
          };

          curToast = await addToast({
            message: <>Connection "{connection.name}" deleted.</>,
            action: (
              <>
                <Button size='small' onClick={onUndoConnection}>
                  UNDO
                </Button>
              </>
            ),
          });

          createSystemNotification(
            `Connection "${connection.name}" (dialect=${connection.dialect || 'N/A'}) deleted`,
          );
        } catch (err1) {
          curToast = await addToast({
            message: `Failed to delete connection "${connection.name}" (dialect=${
              connection.dialect || 'N/A'
            })`,
          });
        }
      };

      await modal({
        title: 'Confirmation?',
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>Delete this connection {connection.name}?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: 'auto', display: 'flex', gap: 3 }}>
                <Button size='small' onClick={dismissDialog}>
                  No
                </Button>
                <Button type='submit' variant='contained' size='small'>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: 'xs',
      });
    } catch (err) {}
  };

  const onShowBookmarks = async () => {
    try {
      await modal({
        title: 'Bookmarks',
        message: <BookmarksItemListModalContent onAfterSelect={dismissDialog} />,
        size: 'md',
        showCloseButton: true,
      });
    } catch (err) {}
  };

  const onAddConnectionToBookmark = async (connection: SqluiCore.ConnectionProps) => {
    const newName = await prompt({
      title: 'Add connection to Bookmarks',
      message: 'A bookmark name',
      value: `${connection.name || ''} - ${new Date().toLocaleString()}`,
      saveLabel: 'Save',
    });
    const { status, ...restOfConnectionMetaData } = connection;

    await addBookmarkItem({
      type: 'Connection',
      name: restOfConnectionMetaData.name,
      data: restOfConnectionMetaData,
    });

    const curToast = await addToast({
      message: `Connection "${newName}" added to Bookmarks.`,
    });
  };

  const onRefreshConnection = async (connection: SqluiCore.ConnectionProps) => {
    let curToast;

    curToast = await addToast({
      message: `Refreshing connection "${connection.name}", please wait...`,
    });

    let resultMessage = '';
    try {
      await reconnectConnection(connection.id);
      resultMessage = `Successfully connected to "${connection.name}" (dialect=${
        connection.dialect || 'N/A'
      })`;
    } catch (err) {
      resultMessage = `Failed to connect to "${connection.name}"`;
    }

    await curToast.dismiss();
    curToast = await addToast({
      message: resultMessage,
    });

    createSystemNotification(resultMessage);
  };

  const onDuplicateConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Duplicating connection "${connection.name}", please wait...`,
    });

    duplicateConnection(connection);
  };

  const onExportConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Exporting connection "${connection.name}", please wait...`,
    });

    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection)], null, 2),
      'text/json',
    );
  };

  const onSelectConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Connection "${connection.name}" selected for query`,
    });

    selectCommand({
      event: 'clientEvent/query/apply/active',
      data: {
        connectionId: connection.id,
        databaseId: '',
      },
    });
  };

  const onImport = async (value = '') => {
    try {
      const rawJson = await prompt({
        title: 'Import Connections / Queries',
        message: 'Import',
        saveLabel: 'Import',
        value: value,
        required: true,
        isLongPrompt: true,
      });

      let jsonRows: any[];
      try {
        jsonRows = JSON.parse(rawJson || '');
      } catch (err) {
        return alert(`Import failed. Invalid JSON config`);
      }

      const curToast = await addToast({
        message: 'Importing, please wait...',
      });

      // here we will attempt to import all the connections first before queries
      jsonRows = jsonRows.sort((a, b) => {
        return a._type.localeCompare(b._type); //note that query will go after connection (q > c)
      });

      // check for duplicate id
      const hasDuplicateIds =
        new Set([...jsonRows.map((jsonRow) => jsonRow.id)]).size !== jsonRows.length;
      if (hasDuplicateIds) {
        return alert(`Import failed. JSON Config includes duplicate IDs.`);
      }

      let failedCount = 0,
        successCount = 0;
      for (const jsonRow of jsonRows) {
        try {
          const { _type, ...rawImportMetaData } = jsonRow;
          switch (_type) {
            case 'connection':
              await importConnection(rawImportMetaData);
              break;

            case 'query':
              await connectionQueries.onImportQuery(jsonRow);
              break;
          }
          successCount++;
        } catch (err) {
          console.log('>> Import Failed', jsonRow, err);
          failedCount++;
        }
      }

      await curToast.dismiss();
      alert(`Import finished with ${successCount} successes and ${failedCount} failures`);
    } catch (err) {}
  };

  const onShowCommandPalette = async () => {
    try {
      const onSelectCommand = (command: Command) => {
        dismissDialog();
        _executeCommandPalette(command);
      };
      await modal({
        title: 'Command Palette',
        message: <CommandPalette onSelectCommand={onSelectCommand} />,
        size: 'sm',
      });
    } catch (err) {}
  };

  const onShowRecordDetails = async (data: any, isEditMode: boolean) => {
    try {
      await modal({
        title: 'Record Details',
        message: <RecordDetailsPage data={data} isEditMode={isEditMode} />,
        size: 'md',
        showCloseButton: true,
      });
    } catch (err) {}
  };

  const onCheckForUpdate = async () => {
    let contentDom: React.ReactNode;

    const newVersion = await fetch('https://synle.github.io/sqlui-native/package.json')
      .then((r) => r.json())
      .then((r) => r.version);

    if (newVersion === appPackage.version) {
      contentDom = (
        <>
          <Box className='FormInput__Row'>sqlui-native is up to date</Box>
          <Box className='FormInput__Row'>
            <label>Version:</label>
            {appPackage.version}
          </Box>
        </>
      );
    } else {
      const platform = window?.process?.platform;
      const downloadLink =
        platform === 'darwin'
          ? `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.dmg`
          : `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.exe`;

      const onDownloadLatestVersion = () => {
        selectCommand({ event: 'clientEvent/openExternalUrl', data: downloadLink });
      };

      contentDom = (
        <>
          <Box className='FormInput__Row'>
            <label>Your version:</label>
            {appPackage.version}
          </Box>
          <Box className='FormInput__Row'>
            <label>Latest version:</label>
            {newVersion}
            <span>
              (
              <Link onClick={onDownloadLatestVersion} sx={{ cursor: 'pointer' }}>
                Download it here
              </Link>
              )
            </span>
          </Box>
        </>
      );
    }

    const onGoToHomepage = () => {
      const data = 'https://synle.github.io/sqlui-native/';
      selectCommand({ event: 'clientEvent/openExternalUrl', data });
    };

    const onRevealDataLocation = () => {
      const platform = window?.process?.platform;
      const storageDir = serverConfigs?.storageDir || '';

      if (!storageDir) {
        return;
      }

      // copy the path to clipboard
      navigator.clipboard.writeText(storageDir);

      if (window.isElectron) {
        if (platform === 'win32') {
          execute(`explorer.exe "${storageDir}"`);
        } else if (platform === 'darwin') {
          execute(`open "${storageDir}"`);
        } else {
          // anything else
        }
      }
    };

    await modal({
      title: 'Check for update',
      message: (
        <Box className='FormInput__Container FormInput__Container__sm'>
          {contentDom}
          <Box className='FormInput__Row'>
            <label>Data Location:</label>
            <Link onClick={onRevealDataLocation}>{serverConfigs?.storageDir}</Link>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Link onClick={onGoToHomepage}>synle.github.io/sqlui-native</Link>
          </Box>
        </Box>
      ),
      showCloseButton: true,
      size: 'xs',
    });
  };

  const onShowSettings = async () => {
    await modal({
      title: 'Settings',
      message: <Settings />,
      showCloseButton: true,
      size: 'xs',
    });
  };

  const onUpdateSetting = (key: SqluiFrontend.SettingKey, newValue: string) => {
    if (!settings) {
      return;
    }

    //@ts-ignore
    settings[key] = newValue;

    onChangeSettings(settings);
  };

  // mission control commands
  async function _executeCommandPalette(command: Command) {
    if (command) {
      dismissCommand();

      switch (command.event) {
        case 'clientEvent/navigate':
          navigate(command.data as string);
          break;

        case 'clientEvent/showCommandPalette':
          onShowCommandPalette();
          break;

        case 'clientEvent/checkForUpdate':
          onCheckForUpdate();
          break;

        case 'clientEvent/showSettings':
          onShowSettings();
          break;

        case 'clientEvent/clearShowHides':
          onClearConnectionVisibles();
          break;

        case 'clientEvent/changeDarkMode':
          onUpdateSetting('darkMode', command.data as string);
          break;

        case 'clientEvent/changeEditorMode':
          onUpdateSetting('editorMode', command.data as string);
          break;

        case 'clientEvent/changeWrapMode':
          onUpdateSetting('wordWrap', command.data as string);
          break;

        case 'clientEvent/changeQueryTabOrientation':
          onUpdateSetting('queryTabOrientation', command.data as string);
          break;

        case 'clientEvent/changeQuerySelectionMode':
          onUpdateSetting('querySelectionMode', command.data as string);
          break;

        case 'clientEvent/showQueryHelp':
          onShowQueryHelp();
          break;

        case 'clientEvent/showConnectionHelper':
          if (command.data) {
            const { scheme, username, password, host, port, restOfConnectionString, onApply } =
              command.data as any;

            const onApplyConnectionHelper = (newConnectionString: string) => {
              dismissDialog();
              //@ts-ignore
              onApply(newConnectionString);
            };

            modal({
              title: 'Connection Helper',
              message: (
                <ConnectionHelper
                  onChange={onApplyConnectionHelper}
                  onClose={dismissDialog}
                  scheme={scheme}
                  username={username}
                  password={password}
                  host={host}
                  port={port}
                  restOfConnectionString={restOfConnectionString}
                />
              ),
              showCloseButton: true,
              size: 'md',
            });
          }
          break;

        case 'clientEvent/openExternalUrl':
          const url = command.data as string;
          if (url) {
            window.openBrowserLink(url);
          }
          break;

        // overall commands
        case 'clientEvent/import':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onImport(command.data as string);
          } catch (err) {}

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/exportAll':
          onExportAll();
          break;

        // connection commands
        case 'clientEvent/connection/new':
          onNewConnection();
          break;

        case 'clientEvent/connection/delete':
          if (command.data) {
            onDeleteConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case 'clientEvent/connection/refresh':
          if (command.data) {
            onRefreshConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case 'clientEvent/connection/duplicate':
          if (command.data) {
            onDuplicateConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case 'clientEvent/connection/export':
          if (command.data) {
            onExportConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case 'clientEvent/connection/select':
          if (command.data) {
            onSelectConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case 'clientEvent/connection/addToBookmark':
          if (command.data) {
            onAddConnectionToBookmark(command.data as SqluiCore.ConnectionProps);
          }
          break;

        // bookmark commands
        case 'clientEvent/bookmark/show':
          onShowBookmarks();
          break;

        // query commands
        case 'clientEvent/query/new':
          await connectionQueries.onAddQuery();
          break;

        case 'clientEvent/query/show':
          if (command.data) {
            await connectionQueries.onShowQuery((command.data as SqluiFrontend.ConnectionQuery).id);
          }
          break;

        case 'clientEvent/query/apply': // based on the setting use either new query or selected query
          if (command.data) {
            const querySelectionMode = settings?.querySelectionMode || 'new-tab';

            onApplyQuery(
              command.data as SqluiFrontend.PartialConnectionQuery,
              querySelectionMode === 'new-tab',
              command.label,
            );

            document.querySelector('#QueryBoxTabs')?.scrollIntoView();
          }
          break;

        case 'clientEvent/query/apply/active': // currently selected / active query only
          if (command.data) {
            onApplyQuery(
              command.data as SqluiFrontend.PartialConnectionQuery,
              false, // same-tab
              command.label,
            );
          }
          break;

        case 'clientEvent/query/apply/new': // create new query and apply
          if (command.data) {
            onApplyQuery(
              command.data as SqluiFrontend.PartialConnectionQuery,
              true, // new-tab
              command.label,
            );
          }
          break;

        case 'clientEvent/query/pin':
          if (command.data) {
            onPinQuery(command.data as SqluiFrontend.ConnectionQuery, true);
          }
          break;

        case 'clientEvent/query/unpin':
          if (command.data) {
            onPinQuery(command.data as SqluiFrontend.ConnectionQuery, false);
          }
          break;

        case 'clientEvent/query/changeTabOrdering':
          const { from, to } = command?.data as any;
          if (from !== undefined && to !== undefined) {
            await connectionQueries.onChangeTabOrdering(from, to);
          }
          break;

        case 'clientEvent/query/showNext':
        case 'clientEvent/query/showPrev':
          onShowQueryWithDirection(command.event === 'clientEvent/query/showNext' ? 1 : -1);
          break;

        case 'clientEvent/query/rename':
          if (command.data) {
            onRenameQuery(command.data as SqluiFrontend.ConnectionQuery);
          } else if (activeQuery) {
            onRenameQuery(activeQuery as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/export':
          if (command.data) {
            onExportQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/duplicate':
          if (command.data) {
            onDuplicateQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/close':
          if (command.data) {
            onCloseQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/closeOther':
          if (command.data) {
            onCloseOtherQueries(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/closeToTheRight':
          if (command.data) {
            onCloseQueriesToTheRight(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/closeCurrentlySelected':
          // this closes the active query
          if (activeQuery) {
            onCloseQuery(activeQuery);
          }
          break;

        case 'clientEvent/query/reveal':
          // this reveal the current query connection
          // but keep the old state
          if (activeQuery) {
            onRevealQueryConnection(activeQuery, false);
          }
          break;

        case 'clientEvent/query/revealThisOnly':
          // this reveal ONLY the current query connection
          // and hide everything else
          if (command.data) {
            onRevealQueryConnection(command.data as SqluiFrontend.ConnectionQuery, true);
          }
          break;

        case 'clientEvent/query/addToBookmark':
          // this reveal the current query connection
          if (command.data) {
            onAddQueryToBookmark(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case 'clientEvent/query/showSampleCodeSnippet':
          if (command.data) {
            const { connection, query, language } = command.data as any;

            const codeSnippet = getCodeSnippet(connection, query, language);

            const onDownloadCodeSnippet = () => {
              let extension = '';
              switch (language) {
                case 'javascript':
                  extension = 'js';
                  break;

                case 'python':
                  extension = 'py';
                  break;

                case 'java':
                  extension = 'java';
                  break;
              }
              if (extension) {
                downloadText(
                  `sample-code-snippet-${Date.now()}.${extension}`,
                  codeSnippet,
                  'text/plain',
                );
              }
            };

            modal({
              title: 'Sample Code Snippet',
              message: (
                <Box className='FormInput__Container'>
                  <Box>
                    <strong>LanguageMode:</strong> {language}
                  </Box>
                  <CodeEditorBox value={codeSnippet} language={language} height='60vh' />
                  <Box sx={{ display: 'flex', justifyContent: 'end' }}>
                    <Button onClick={onDownloadCodeSnippet}>Download Code Snippet</Button>
                  </Box>
                </Box>
              ),
              showCloseButton: true,
              size: 'md',
            });
          }
          break;

        // records command
        case 'clientEvent/record/showDetails':
          if (command.data) {
            onShowRecordDetails(command.data, false);
          }
          break;

        case 'clientEvent/record/edit':
          if (command.data) {
            onShowRecordDetails(command.data, true);
          }
          break;

        case 'clientEvent/record/new':
          navigate('/record/new');
          break;

        // session commands
        case 'clientEvent/session/switch':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onChangeSession();
          } catch (err) {}

          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/new':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onAddSession();
          } catch (err) {}

          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/clone':
          try {
            window.toggleElectronMenu(false, allMenuKeys);

            if (command.data) {
              await onCloneSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onCloneSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {}

          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/rename':
          try {
            window.toggleElectronMenu(false, allMenuKeys);

            if (command.data) {
              await onRenameSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onRenameSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {}

          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/delete':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            if (command.data) {
              await onDeleteSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onDeleteSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {}

          window.toggleElectronMenu(true, allMenuKeys);
          break;
      }
    }
  }

  useEffect(() => {
    _executeCommandPalette(command);
  }, [command]);

  useEffect(() => {
    const onKeyboardShortcutEventForAll = (e: KeyboardEvent) => {
      const hasModifierKey = e.altKey || e.ctrlKey || e.metaKey;
      const { key } = e;

      // here are keybindings that are used for both the electron and web mocked
      if (hasModifierKey) {
        // with modifier key
        switch (key) {
          case 'Enter':
            try {
              (
                document.querySelector(
                  '.AdvancedEditorContainer .inputarea.monaco-mouse-cursor-text,.SimpleEditorContainer',
                ) as HTMLTextAreaElement
              ).blur();

              setTimeout(() =>
                (document.querySelector('#btnExecuteCommand') as HTMLButtonElement).click(),
              );
              e.stopPropagation();
              e.preventDefault();
            } catch (err) {}
            break;

          case 'f':
            try {
              (document.querySelector('#result-box-search-input') as HTMLInputElement)?.focus();
              e.stopPropagation();
              e.preventDefault();
            } catch (err) {}
            break;
        }
      }
    };
    // this section below is strictly for mocked webserver
    const onKeyboardShortcutEventForMockedServer = (e: KeyboardEvent) => {
      const hasModifierKey = e.altKey || e.ctrlKey || e.metaKey;

      let onShowCommandPalette = false;
      let preventDefault = false;
      let command: Command | undefined;
      const { key } = e;

      if (hasModifierKey) {
        // with modifier key
        switch (key) {
          case 'p':
            command = {
              event: 'clientEvent/showCommandPalette',
            };
            break;

          case 't':
            command = {
              event: 'clientEvent/query/new',
            };
            break;

          case 'o':
            command = {
              event: 'clientEvent/import',
            };
            break;

          case 's':
            command = {
              event: 'clientEvent/exportAll',
            };
            break;

          case 'n':
            command = {
              event: 'clientEvent/connection/new',
            };
            break;

          case 'w':
            command = {
              event: 'clientEvent/query/closeCurrentlySelected',
            };
            break;

          case '{':
            command = {
              event: 'clientEvent/query/showPrev',
            };
            break;

          case '}':
            command = {
              event: 'clientEvent/query/showNext',
            };
            break;
        }
      } else {
        // no modifier key
        switch (key) {
          case 'F2':
            command = {
              event: 'clientEvent/query/rename',
            };
            break;
        }
      }

      if (command) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (command) {
        selectCommand(command);
      }
    };

    document.addEventListener('keydown', onKeyboardShortcutEventForAll, true);
    !window.isElectron &&
      document.addEventListener('keydown', onKeyboardShortcutEventForMockedServer, true);
    return () => {
      document.removeEventListener('keydown', onKeyboardShortcutEventForAll);
      !window.isElectron &&
        document.removeEventListener('keydown', onKeyboardShortcutEventForMockedServer);
    };
  }, []);

  return null;
}
