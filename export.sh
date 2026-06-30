 find . \( -iname "*.js" -o -iname "*.html" -o -iname "*.css" \) -type f -print0 | while IFS= read -r -d '' file; do     echo "inicio $file";     cat "$file";     echo;     echo "fin $file";     echo; done > proyecto.txt
 awk 'NF' proyecto.txt > proyecto_sin_blancos.txt
 tr '\n' ' ' < proyecto_sin_blancos.txt > proyecto_1linea.txt