- Tester si le script .mjs sur le NAS marche sur Windows aussi
	Le script fonctionne .mjs sur le NAS et Windows
	Publication-automatique.sh aussi, pour windows il faut l'executer via gitbash

	A rajouter dans guidedeveloppeur ou readme :
		- Installation de VsCode
  		- Utilisation de Git bash quand on est sous windows
  		- bien penser a faire un git Pull.
  
- Faire ou adapter le script pour detecter les nouvelles competitions
     Avoir un fichier log dans le repo git avec les nouvelles competitions
     Avoir une notification si le fichier a été push ou via une date peut etre     
	
- Dans gitub action faire une verif si matchs.json est trop vieux d'1 semaine (via un script surement)
  	Evoyer un mail.

le doc guideveloppeur est fait mais il faudra peut etre revoir des choses
	j'ai du mettre le git user dans le script
	
	Frequemment il faudra faire un git clone. Peut etre automatiser la tache sur le NAS. 
		Sur windows plutot faire un git pull

Documenter les fichiers

Readapter pour le faire sur le repo officiel et a lancer tous les jours

Faire le menage sur le NAS et penser à supprimer les fichiers .log. A faire uniquement quand on lance le script
