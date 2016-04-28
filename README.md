##clustering

Проект по кластеризации предпочтений жителей города по перемещению, выраженных в виде
множества точек отправления и прибытия на карте OpenStreetMap.

----
Для работы необходим python v2.7.

If you have run the clustering script in this directory which created some temporary files that you wish to delete, the following commands will clean any untracked changes in the local repository made since last "git pull" or "git push", effectively undoing any changes made. This is, of course, if you haven't asked Git to track those files using "git add":

1. git clean -df

This command removes any files untracked by Git

2. git checkout -- .

This restores all files tracked by Git to their state since last "git pull" or "git push", reverting any changes you may have made.

####Ссылки:
- [k-means](/kmeans.py): кластеризатор точек методом K-Means
- [github.io](http://vstu-cad-stuff.github.io/clustering/cluster): визуализации работы алгоритмов
