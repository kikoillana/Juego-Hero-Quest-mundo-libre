using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace HeroQuest25DLauncher
{
    internal static class Program
    {
        private const string Host = "127.0.0.1";
        private const int Port = 8081;
        private static readonly string AppUrl = "http://127.0.0.1:8081";

        [STAThread]
        private static int Main(string[] args)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            bool checkOnly = args != null && args.Length > 0 && args[0] == "--check";

            Process serverProc = null;

            try
            {
                if (!IsPortOpen(Host, Port))
                {
                    serverProc = StartNodeBackend(baseDir);
                    if (serverProc == null)
                        return 1;

                    // Esperar hasta 8 s a que el backend abra el puerto (o detectar que ha muerto)
                    for (int i = 0; i < 80; i++)
                    {
                        if (IsPortOpen(Host, Port))
                            break;
                        if (serverProc.HasExited)
                        {
                            throw new Exception("El servidor Node terminó con código " + serverProc.ExitCode +
                                ". Revisa server-error.log para más detalles.");
                        }
                        Thread.Sleep(100);
                    }

                    if (!IsPortOpen(Host, Port))
                        throw new Exception("El servidor Node no respondió en el puerto " + Port + " tras 8 segundos.");
                }

                if (checkOnly)
                {
                    Console.WriteLine("HeroQuest25D.exe Ready -> " + AppUrl);
                    return IsPortOpen(Host, Port) ? 0 : 1;
                }

                LaunchDesktopGameWindow(AppUrl);
                return 0;
            }
            catch (Exception ex)
            {
                try
                {
                    File.WriteAllText(Path.Combine(baseDir, "launcher-error.log"), ex.ToString());
                }
                catch { }
                if (!checkOnly)
                {
                    ShowError("No se pudo iniciar HeroQuest 2.5D:\n\n" + ex.Message +
                        "\n\nDetalles en launcher-error.log");
                }
                return 1;
            }
        }

        private static void ShowError(string message)
        {
            try
            {
                MessageBox.Show(message, "HeroQuest 2.5D", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch { }
        }

        private static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(250));
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Localiza node.exe. Con UseShellExecute=false, CreateProcess solo mira el PATH heredado
        /// (que puede estar desactualizado si Node se instaló después de iniciar sesión, o no incluir
        /// los "shims" de nvm/fnm/volta). Por eso se buscan rutas candidatas explícitamente.
        /// </summary>
        private static string ResolveNodePath(string baseDir)
        {
            var candidates = new List<string>();

            string env = Environment.GetEnvironmentVariable("NODE_EXE");
            if (!string.IsNullOrEmpty(env)) candidates.Add(env);

            // Runtime empaquetado opcional junto al ejecutable
            candidates.Add(Path.Combine(Path.Combine(baseDir, "node"), "node.exe"));

            // PATH actual + PATH de máquina y usuario leídos del registro (no la copia antigua de Explorer)
            string paths = (Environment.GetEnvironmentVariable("PATH") ?? "") + ";" +
                (Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "") + ";" +
                (Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User) ?? "");
            foreach (string raw in paths.Split(';'))
            {
                string p = raw.Trim().Trim('"');
                if (p.Length == 0) continue;
                try
                {
                    candidates.Add(Path.Combine(Environment.ExpandEnvironmentVariables(p), "node.exe"));
                }
                catch { }
            }

            string nvm = Environment.GetEnvironmentVariable("NVM_SYMLINK");
            if (!string.IsNullOrEmpty(nvm)) candidates.Add(Path.Combine(nvm, "node.exe"));

            candidates.Add(Path.Combine(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs"), "node.exe"));
            candidates.Add(Path.Combine(Path.Combine(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs"), "nodejs"), "node.exe"));

            foreach (string f in candidates)
            {
                try
                {
                    if (File.Exists(f)) return f;
                }
                catch { }
            }
            return null;
        }

        private static Process StartNodeBackend(string baseDir)
        {
            string serverScript = Path.Combine(Path.Combine(baseDir, "server"), "server.mjs");
            if (!File.Exists(serverScript))
            {
                throw new FileNotFoundException("No se encuentra el script del servidor", serverScript);
            }

            string nodePath = ResolveNodePath(baseDir);
            if (nodePath == null)
            {
                string msg = "No se encontró Node.js (versión 22.5 o superior).\n\n" +
                    "Instálalo desde https://nodejs.org o define la variable de entorno NODE_EXE " +
                    "con la ruta completa a node.exe.";
                try
                {
                    File.WriteAllText(Path.Combine(baseDir, "launcher-error.log"), msg);
                }
                catch { }
                ShowError(msg);
                return null;
            }

            var psi = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = "\"" + serverScript + "\"",
                WorkingDirectory = baseDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            // Nota: no se redirige stderr; el launcher termina tras abrir la ventana y una tubería
            // cerrada haría fallar al servidor. server.mjs escribe sus errores fatales en server-error.log.
            return Process.Start(psi);
        }

        private static void LaunchDesktopGameWindow(string url)
        {
            string[] browserCandidates = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
            };

            foreach (string browserPath in browserCandidates)
            {
                if (File.Exists(browserPath))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = browserPath,
                        Arguments = "--app=" + url + " --window-size=1440,900",
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                    return;
                }
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
    }
}
