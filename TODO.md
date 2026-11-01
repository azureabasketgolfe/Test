- Tester si le script .mjs sur le NAS marche sur Windows aussi
	Le script fonctionne .mjs sur le NAS et Windows
	Publication-automatique.sh aussi, pour windows il faut l'executer via gitbash

	A rajouter dans guidedeveloppeur ou readme pour windows:
		- Installation de VsCode
  		- Utilisation de Git bash quand on est sous windows
  		- bien penser a faire un git Pull.
  
- Faire ou adapter le script pour detecter les nouvelles competitions
     Avoir un fichier log dans le repo git avec les nouvelles competitions
     Avoir une notification si le fichier a été push ou via une date peut etre. S'inspirer de ce qui a été fait pour matchs.json     
	
- Dans gitub action
     Envoyer une notification si matchs.json est vieux de 24h

  	N.B: Bien expliquer la conf faite dans github pour la connexion a mon compte yahoo et la conf a faire pour avoir un mot de passe application dans yahoo.
	
	Frequemment il faudra faire un git clone. Peut etre automatiser la tache sur le NAS. 
		Sur windows plutot faire un git pull

Documenter les fichiers

Readapter pour le faire sur le repo officiel et a lancer tous les jours

Faire le menage sur le NAS et penser à supprimer les fichiers .log. A faire uniquement quand on lance le script
