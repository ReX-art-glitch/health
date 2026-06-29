import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background sync task
import { BackgroundSync } from './src/services/SyncManager';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('BackgroundSync', () => BackgroundSync);