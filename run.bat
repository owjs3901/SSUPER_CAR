@echo off

:main
echo 1. build to launch
echo 2. start server
echo 3. start shell

set /p in="input> ":

IF [%in%]==[1] (goto task1
) ELSE IF [%in%]==[2] (goto task2
) ELSE IF [%in%]==[3] (goto task3
) ELSE (
	echo ERROR %in%
	goto main
)


:task1
echo 1. build to launch
cd app
call npm run pack
cd ..
COPY .\icon.png .\app\dist\icon.png
COPY .\appinfo.json .\app\dist\appinfo.json
call .\ares-install -r com.mbs
call .\ares-cli\bin\ares-package -o "out" "./app/dist" -v
call .\ares-cli\bin\ares
call .\ares-cli\bin\ares-install -d target2 .\out\com.mbs_1.0.0_all.ipk
call .\ares-cli\bin\ares-launch com.mbs

echo finish!
goto end

:task2
echo 2. start Server
cd app
call npm run pack
cd ..
call .\ares-cli\bin\ares-server "./app/dist"
goto end

:task3
echo 3. start shell
.\ares-cli\bin\ares-inspect -a com.mbs
:end
pause

goto main

pause