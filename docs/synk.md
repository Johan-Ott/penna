# Synka böcker mellan enheter

Skrivro har inga egna servrar och inga Skrivro-konton. Det finns två vägar att få samma bok på
flera enheter, och de går att använda var för sig eller samtidigt.

## 1. Mappsynk, utan konto

En bok är en vanlig mapp med vanliga filer. Ligger den i en mapp som redan synkas, iCloud Drive,
OneDrive eller Dropbox, följer böckerna med utan att Skrivro vet om det. Välj den mappen som ditt
Skrivro-bibliotek under Inställningar, eller flytta dit en bok du redan har.

Skrivro är byggd för att klara vad synktjänster gör med filer:

- Ändras samma scen på två datorer lägger tjänsten en kopia bredvid originalet. Skrivro känner
  igen kopian, visar båda texterna och raderar aldrig någon av dem (`storage/syncFiles.ts`).
- En fil som iCloud ännu inte hämtat hem syns som "Hämtas", och scenen går inte att skriva i
  förrän den är nere.
- Ändras en fil utanför appen laddas den om tyst när inget är osparat, annars frågar Skrivro.

Vägen når dina datorer. Telefonen har sina böcker i appens egen mapp och kan inte peka ut en
synkad mapp, så den behöver väg 2.

## 2. Google Drive, i appen

Logga in under Inställningar, Synk. Då synkas den öppna boken och dess serie mot mappen
`Skrivro/<bokens mapp>` i din egen Drive, när boken öppnas och sedan var femte minut så länge
Skrivro är igång.

- Skrivro ber bara om scopet `drive.file` och ser alltså enbart de filer den själv skapat i din
  Drive. En bok du själv lagt dit utanför Skrivro är osynlig för appen.
- Ändras samma scen på två enheter behålls båda: Drives text läggs som en kopia märkt med sitt
  datum, och din egen text ligger kvar. Den gamla texten blir en version i Versioner först.
- project.json slås ihop i stället för att skrivas över, så mål och trädets ordning överlever.
- Tas en fil bort på ena sidan hamnar den i papperskorgen på den andra, aldrig i intet.

## Vilken ska man välja

Skriver du på flera datorer och helst slipper konton: väg 1. Skriver du växelvis på dator och
Android-telefon: väg 2, för den är den enda som når telefonen.

## Det som inte finns än

iPad och iPhone har ingen inloggning, så väg 2 når dem inte. iPad väntar på att det byggs.
