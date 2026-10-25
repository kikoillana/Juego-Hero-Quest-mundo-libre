using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

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
                    for (int i = 0; i < 40; i++)
                    {
                        if (IsPortOpen(Host, Port))
                            break;
                        Thread.Sleep(100);
                    }
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
                return 1;
            }
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

        private static Process StartNodeBackend(string baseDir)
        {
            string serverScript = Path.Combine(baseDir, "server", "server.mjs");
            var psi = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = "\"" + serverScript + "\"",
                WorkingDirectory = baseDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden
            };
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
