import asyncpg
from google import genai
from google.genai import types

from app.models.chat import ChatResponse, ChatResponseType
from app.services import observation_service, species_service, zone_service

SYSTEM_PROMPT = """
Tu es un assistant spécialisé dans les mammifères marins (cétacés).
Tu aides l'utilisateur à explorer des données d'observations via des outils.

Règles :
- Commence TOUJOURS par résoudre les noms en IDs avec search_species ou search_zones (limit=2).
- Prends le premier résultat retourné comme référence.
- Appelle ensuite un seul outil de données adapté à la demande.
- Réponds en français, de façon concise (1-2 phrases max).
- Si aucun résultat n'est trouvé, dis-le clairement.
""".strip()

_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_species",
            description="Recherche une espèce par nom (français, anglais ou scientifique). Retourne les 2 meilleures correspondances.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"q": types.Schema(type=types.Type.STRING)},
                required=["q"],
            ),
        ),
        types.FunctionDeclaration(
            name="search_zones",
            description="Recherche une zone géographique par nom (français ou anglais). Retourne les 2 meilleures correspondances.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"q": types.Schema(type=types.Type.STRING)},
                required=["q"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_map_observations",
            description="Récupère les points d'observations géolocalisés. Filtres optionnels : species_id, zone_id, year_min, year_max.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "species_id": types.Schema(type=types.Type.INTEGER),
                    "zone_id": types.Schema(type=types.Type.INTEGER),
                    "year_min": types.Schema(type=types.Type.INTEGER),
                    "year_max": types.Schema(type=types.Type.INTEGER),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_zone_choropleth",
            description="Récupère le polygone et les statistiques d'observations d'une zone pour afficher un choropleth.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"zone_id": types.Schema(type=types.Type.INTEGER)},
                required=["zone_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_species_profile",
            description="Récupère le profil complet d'une espèce (taxonomie, morphologie, biologie, statut IUCN).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"species_id": types.Schema(type=types.Type.INTEGER)},
                required=["species_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_time_series",
            description="Récupère l'évolution annuelle du nombre d'observations d'une espèce.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"species_id": types.Schema(type=types.Type.INTEGER)},
                required=["species_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_top_species",
            description="Classe les espèces les plus observées. Filtre optionnel : zone_id.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "zone_id": types.Schema(type=types.Type.INTEGER),
                    "limit": types.Schema(type=types.Type.INTEGER),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_conservation_history",
            description="Récupère l'historique des statuts IUCN d'une espèce au fil des années.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"species_id": types.Schema(type=types.Type.INTEGER)},
                required=["species_id"],
            ),
        ),
    ]
)

# Mapping outil → type de réponse frontend
_TOOL_RESPONSE_TYPE: dict[str, ChatResponseType] = {
    "get_map_observations": "map",
    "get_zone_choropleth": "choropleth",
    "get_species_profile": "profile",
    "get_time_series": "time_series",
    "get_top_species": "top_species",
    "get_conservation_history": "conservation",
}


async def _execute_tool(
    db: asyncpg.Connection,
    name: str,
    args: dict,
) -> tuple[object, ChatResponseType | None]:
    """Exécute un outil et retourne (résultat sérialisable, type de réponse ou None)."""

    if name == "search_species":
        items, _ = await species_service.search_species(db, args["q"], limit=2, offset=0)
        return [i.model_dump() for i in items], None

    if name == "search_zones":
        zones = await zone_service.list_zones(db, q=args["q"])
        return [z.model_dump() for z in zones[:2]], None

    if name == "get_map_observations":
        data = await observation_service.get_map_observations(
            db,
            species_id=args.get("species_id"),
            zone_id=args.get("zone_id"),
            year_min=args.get("year_min"),
            year_max=args.get("year_max"),
            limit=500,
        )
        return data, "map"

    if name == "get_zone_choropleth":
        choropleth = await zone_service.get_zone_choropleth(db, args["zone_id"])
        return choropleth.model_dump() if choropleth else {}, "choropleth"

    if name == "get_species_profile":
        species = await species_service.get_species_by_id(db, args["species_id"])
        return species.model_dump() if species else {}, "profile"

    if name == "get_time_series":
        items = await observation_service.get_time_series(db, args["species_id"])
        return [i.model_dump() for i in items], "time_series"

    if name == "get_top_species":
        items = await observation_service.get_top_species(
            db,
            zone_id=args.get("zone_id"),
            limit=args.get("limit", 10),
        )
        return [i.model_dump() for i in items], "top_species"

    if name == "get_conservation_history":
        items = await species_service.get_conservation_history(db, args["species_id"])
        return [i.model_dump() for i in items], "conservation"

    return {}, None


async def process_chat(
    db: asyncpg.Connection,
    client: genai.Client,
    query: str,
) -> ChatResponse:
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[_TOOLS],
    )
    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part.from_text(text=query)])
    ]

    response_type: ChatResponseType = "text"
    response_data: dict | list | None = None
    message = ""

    for _ in range(6):
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=config,
        )

        candidate = response.candidates[0]
        contents.append(candidate.content)

        function_calls = [p for p in candidate.content.parts if p.function_call]

        if not function_calls:
            message = response.text or ""
            break

        function_response_parts: list[types.Part] = []
        for part in function_calls:
            fc = part.function_call
            result, data_type = await _execute_tool(db, fc.name, dict(fc.args))
            if data_type:
                response_type = data_type
                response_data = result  # type: ignore[assignment]
            function_response_parts.append(
                types.Part.from_function_response(name=fc.name, response={"result": result})
            )

        contents.append(types.Content(role="user", parts=function_response_parts))

    return ChatResponse(type=response_type, data=response_data, message=message)
