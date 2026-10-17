// Who the app is, for what llkit writes in its name: the error report and feedback. The app hands
// it in once as it starts; the version comes from the build (__APP_VERSION__).

let name = "";

export const provideAppName = (appName: string) => void (name = appName);

export const appInfo = () => ({ name, version: __APP_VERSION__ });
