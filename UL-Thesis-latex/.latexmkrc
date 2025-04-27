$pdflatex = 'xelatex %O %S'; # Use xelatex
$jobname = "TFC_Ferramenta_de_Anotacao_2a_Entrega_27_04_2025"; 
$out_dir = "_build";  # Output directory
ensure_path('dvi', $out_dir);
ensure_path('ps', $out_dir);
ensure_path('pdf', $out_dir);
# $xelatex = "xelatex -synctex=1 -interaction=nonstopmode -file-line-error -jobname=$jobname"; # No longer needed