package com.miniroom.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Furniture, floors, walls and backdrops a layout may use. The JSON files in resources/catalog are the single
 * source: the frontend imports the same files (AGENTS.md: furniture list is a JSON file, not DB rows).
 */
@Component
public class Catalog {

    /** category: large, prop, rug, wall. size: footprint in cells [width (x), depth (y)] at rotation 0. */
    public record Furniture(String id, String name, String category, int[] size, String glb) {

        public boolean isRug() { return "rug".equals(category); }
        public boolean isWallDecor() { return "wall".equals(category); }
    }

    record Surface(String id, String name) {}

    record Surfaces(List<Surface> floors, List<Surface> walls, List<Surface> backdrops) {}

    private final Map<String, Furniture> furniture;
    private final Set<String> floors;
    private final Set<String> walls;
    private final Set<String> backdrops;

    public Catalog() {
        this("catalog");
    }

    /** dir: classpath folder with furniture.json and surfaces.json (tests use one with a rug and wall decor). */
    Catalog(String dir) {
        var json = JsonMapper.builder().build();
        List<Furniture> pieces = read(json, dir + "/furniture.json", new TypeReference<>() {});
        Surfaces surfaces = read(json, dir + "/surfaces.json", new TypeReference<>() {});
        this.furniture = pieces.stream().collect(Collectors.toUnmodifiableMap(Furniture::id, Function.identity()));
        this.floors = ids(surfaces.floors());
        this.walls = ids(surfaces.walls());
        this.backdrops = ids(surfaces.backdrops());
    }

    public Optional<Furniture> furniture(String id) { return Optional.ofNullable(furniture.get(id)); }
    public boolean isFloor(String id) { return floors.contains(id); }
    public boolean isWall(String id) { return walls.contains(id); }
    public boolean isBackdrop(String id) { return backdrops.contains(id); }

    private static Set<String> ids(List<Surface> list) {
        return list.stream().map(Surface::id).collect(Collectors.toUnmodifiableSet());
    }

    private static <T> T read(JsonMapper json, String path, TypeReference<T> type) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return json.readValue(in, type);
        } catch (IOException e) {
            throw new UncheckedIOException("cannot read " + path, e);
        }
    }
}
